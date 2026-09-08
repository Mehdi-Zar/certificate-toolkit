#!/usr/bin/env bash
#
# generate-csr.sh - Genere une cle privee + une CSR pour un FQDN quelconque.
#
# Tout est pilote par les arguments. Le script cree l'arborescence suivante,
# que make-pfx.sh sait relire ensuite :
#
#   <racine>/<fqdn>/
#       <fqdn>.key.pem      cle privee
#       <fqdn>-req.cnf      configuration OpenSSL utilisee
#       <fqdn>.csr          demande a envoyer a la PKI
#       <fqdn>.meta         parametres de la demande (relu par make-pfx.sh)
#       Signed/             deposez ici les fichiers renvoyes par la PKI
#
# Etape suivante une fois la PKI passee :  ./make-pfx.sh <fqdn>
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --------------------------------------------------------------------------
# Valeurs par defaut (surchargeables par options ou par variables d'env)
# --------------------------------------------------------------------------
ROOT_DIR="${CERT_HOME:-$SCRIPT_DIR}"
COUNTRY="${CERT_COUNTRY:-FR}"
ORG="${CERT_ORG:-Ma Societe}"
OU="${CERT_OU:-SecOps}"
EMAIL="${CERT_EMAIL:-pki@exemple.fr}"
BITS=2048
KEYTYPE="rsa"          # rsa | ec
CURVE="P-256"
DIGEST="sha256"
FORCE=0
ALTS=()

usage() {
  cat <<'EOU'
Usage : generate-csr.sh <fqdn> [SAN...] [options]

  <fqdn>                  Common Name du certificat. Ajoute automatiquement
                          en premier SAN (DNS).
  [SAN...]                SAN supplementaires, en positionnel ou via -a.

Options :
  -a, --alt NOM           SAN supplementaire, repetable. Accepte :
                          "www.exemple.fr"  -> DNS:www.exemple.fr
                          "IP:10.0.0.1", "DNS:x", "email:x", "URI:x"
  -c, --country CODE      C=   (defaut : FR,               $CERT_COUNTRY)
  -o, --org NOM           O=   (defaut : Ma Societe,           $CERT_ORG)
  -u, --ou NOM            OU=  (defaut : SecOps, $CERT_OU)
  -e, --email ADRESSE     emailAddress dans le DN. "" pour ne pas en mettre.
  -b, --bits N            Taille de cle RSA : 2048 | 3072 | 4096 (defaut 2048)
      --ec [COURBE]       Cle EC (defaut P-256) au lieu de RSA
      --digest ALGO       Empreinte de signature (defaut sha256)
  -d, --dir DOSSIER       Racine de travail (defaut : dossier du script,
                          ou $CERT_HOME)
      --force             Ecrase une cle privee existante (DANGEREUX : un
                          certificat deja en cours de signature devient
                          inutilisable)
  -h, --help              Cette aide

Exemples :
  ./generate-csr.sh www.exemple.fr
  ./generate-csr.sh api.exemple.fr www.exemple.fr exemple.fr
  ./generate-csr.sh vpn.exemple.fr -a IP:10.20.30.40 -b 4096 -u SecOps
  ./generate-csr.sh svc.interne.local -o "Ma Societe" -e "" --ec
EOU
}

die() { echo "ERREUR : $*" >&2; exit 1; }
ok()  { echo "  [OK] $*"; }

# --------------------------------------------------------------------------
# Analyse des arguments : le 1er positionnel est le FQDN, les suivants des SAN
# --------------------------------------------------------------------------
FQDN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -a|--alt)      ALTS+=("$2"); shift 2 ;;
    -c|--country)  COUNTRY="$2"; shift 2 ;;
    -o|--org)      ORG="$2"; shift 2 ;;
    -u|--ou)       OU="$2"; shift 2 ;;
    -e|--email)    EMAIL="$2"; shift 2 ;;
    -b|--bits)     BITS="$2"; shift 2 ;;
    --ec)
      KEYTYPE="ec"
      if [[ "${2:-}" =~ ^(P-256|P-384|P-521|prime256v1|secp384r1)$ ]]; then
        CURVE="$2"; shift
      fi
      shift ;;
    --digest)      DIGEST="$2"; shift 2 ;;
    -d|--dir)      ROOT_DIR="$2"; shift 2 ;;
    --force)       FORCE=1; shift ;;
    -h|--help)     usage; exit 0 ;;
    -*)            echo "Option inconnue : $1" >&2; usage; exit 1 ;;
    *)
      if [[ -z "$FQDN" ]]; then FQDN="$1"; else ALTS+=("$1"); fi
      shift ;;
  esac
done

[[ -n "$FQDN" ]] || { usage; exit 1; }
command -v openssl >/dev/null || die "openssl introuvable dans le PATH"
[[ "$KEYTYPE" == "rsa" && ! "$BITS" =~ ^[0-9]+$ ]] && die "taille de cle invalide : $BITS"

# --------------------------------------------------------------------------
# Chemins
# --------------------------------------------------------------------------
WORK="$ROOT_DIR/$FQDN"
KEY="$WORK/$FQDN.key.pem"
CNF="$WORK/$FQDN-req.cnf"
CSR="$WORK/$FQDN.csr"
META="$WORK/$FQDN.meta"
SIGNED="$WORK/Signed"

if [[ -f "$KEY" && "$FORCE" -eq 0 ]]; then
  echo "Une cle privee existe deja : $KEY" >&2
  echo "Si une CSR est en cours de signature chez la PKI, la regenerer rendrait" >&2
  echo "le certificat a venir inutilisable. Utilisez --force pour passer outre," >&2
  echo "ou -d <autre-dossier> pour repartir a cote." >&2
  exit 1
fi

mkdir -p "$WORK" "$SIGNED"

# --------------------------------------------------------------------------
# Construction de la liste des SAN : le CN d'abord, puis les extras, dedoublonnes
# --------------------------------------------------------------------------
normalize_san() {
  local v="$1"
  case "$v" in
    DNS:*|IP:*|email:*|URI:*|RID:*|otherName:*) printf '%s' "$v" ;;
    # une valeur purement numerique/hexa avec des ':' ou des '.' = adresse IP
    *) if [[ "$v" =~ ^[0-9]+(\.[0-9]+){3}$ || "$v" =~ ^[0-9A-Fa-f:]+$ && "$v" == *:* ]]; then
         printf 'IP:%s' "$v"
       else
         printf 'DNS:%s' "$v"
       fi ;;
  esac
}

SAN_LIST=("$(normalize_san "$FQDN")")
for a in "${ALTS[@]:-}"; do
  [[ -n "$a" ]] || continue
  n="$(normalize_san "$a")"
  dup=0
  for e in "${SAN_LIST[@]}"; do [[ "$e" == "$n" ]] && dup=1 && break; done
  [[ "$dup" -eq 0 ]] && SAN_LIST+=("$n")
done

# Lignes alt_names numerotees par type (DNS.1, DNS.2, IP.1, ...)
declare -A IDX=()
ALT_BLOCK=""
for e in "${SAN_LIST[@]}"; do
  t="${e%%:*}"; v="${e#*:}"
  IDX["$t"]=$(( ${IDX["$t"]:-0} + 1 ))
  ALT_BLOCK+="$t.${IDX[$t]} = $v"$'\n'
done

# --------------------------------------------------------------------------
# Generation de la cle privee
# --------------------------------------------------------------------------
echo "== 1. Cle privee =========================================="
if [[ "$KEYTYPE" == "ec" ]]; then
  openssl genpkey -algorithm EC -pkeyopt "ec_paramgen_curve:$CURVE" -out "$KEY" 2>/dev/null
  KEYDESC="EC $CURVE"
else
  openssl genpkey -algorithm RSA -pkeyopt "rsa_keygen_bits:$BITS" -out "$KEY" 2>/dev/null
  KEYDESC="RSA $BITS bits"
fi
chmod 600 "$KEY" 2>/dev/null || true
ok "$KEYDESC -> $KEY"

# --------------------------------------------------------------------------
# Fichier de configuration OpenSSL
# --------------------------------------------------------------------------
echo
echo "== 2. Configuration OpenSSL ==============================="
{
  echo "[ req ]"
  echo "default_md = $DIGEST"
  echo "prompt = no"
  echo "distinguished_name = req_distinguished_name"
  echo "req_extensions = req_ext"
  echo
  echo "[ req_distinguished_name ]"
  [[ -n "$COUNTRY" ]] && echo "countryName = $COUNTRY"
  [[ -n "$ORG"     ]] && echo "organizationName = $ORG"
  [[ -n "$OU"      ]] && echo "organizationalUnitName = $OU"
  echo "commonName = $FQDN"
  [[ -n "$EMAIL"   ]] && echo "emailAddress = $EMAIL"
  echo
  echo "[ req_ext ]"
  echo "subjectAltName = @alt_names"
  echo "basicConstraints = CA:FALSE"
  echo "keyUsage = critical, digitalSignature, keyEncipherment"
  echo "extendedKeyUsage = serverAuth, clientAuth"
  echo
  echo "[ alt_names ]"
  printf '%s' "$ALT_BLOCK"
} > "$CNF"
ok "$CNF"

# --------------------------------------------------------------------------
# CSR
# --------------------------------------------------------------------------
echo
echo "== 3. CSR ================================================="
openssl req -new -key "$KEY" -out "$CSR" -config "$CNF" -extensions req_ext
openssl req -in "$CSR" -noout -verify >/dev/null 2>&1 \
  || die "la CSR generee ne se verifie pas"
ok "$CSR"

# --------------------------------------------------------------------------
# Metadonnees relues par make-pfx.sh
# --------------------------------------------------------------------------
{
  echo "# genere par generate-csr.sh le $(date '+%Y-%m-%d %H:%M:%S')"
  echo "FQDN=\"$FQDN\""
  echo "KEY=\"$KEY\""
  echo "CSR=\"$CSR\""
  echo "CNF=\"$CNF\""
  echo "SIGNED_DIR=\"$SIGNED\""
  echo "KEYDESC=\"$KEYDESC\""
  echo "SANS=\"${SAN_LIST[*]}\""
} > "$META"

# --------------------------------------------------------------------------
# Recapitulatif
# --------------------------------------------------------------------------
echo
echo "== 4. Recapitulatif ======================================="
openssl req -in "$CSR" -noout -subject -nameopt RFC2253 | sed 's/^/  /'
echo "  SAN     : ${SAN_LIST[*]}"
echo "  Cle     : $KEYDESC"
echo "  Signature demandee : $DIGEST"
echo
echo "A envoyer a la PKI :"
echo "  $CSR"
echo
echo "Au retour, deposez le ou les fichiers signes dans :"
echo "  $SIGNED"
echo "puis lancez :"
echo "  $SCRIPT_DIR/make-pfx.sh $FQDN -d \"$ROOT_DIR\""
