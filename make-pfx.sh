#!/usr/bin/env bash
#
# make-pfx.sh - Assemble un PKCS#12 (.pfx) complet quand la PKI a signe la CSR.
#
# Pendant de generate-csr.sh : il retrouve tout seul, a partir du seul FQDN,
# la cle privee et les fichiers renvoyes par la PKI.
#
#   <racine>/<fqdn>/
#       <fqdn>.key.pem      cle privee          (produite par generate-csr.sh)
#       <fqdn>.meta         parametres          (produits par generate-csr.sh)
#       Signed/             fichiers de la PKI  (deposes par vous)
#         -> produit <fqdn>.pfx, .crt.pem, .chain.pem, .fullchain.pem
#
# Accepte n'importe quel format de retour PKI : PEM, CRT, CER (base64 ou DER),
# P7B / P7C (PKCS#7 PEM ou DER), bundle complet ou certificat seul.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --------------------------------------------------------------------------
# Valeurs par defaut
# --------------------------------------------------------------------------
ROOT_DIR="${CERT_HOME:-$SCRIPT_DIR}"
FQDN=""
INPUTS=()
CHAIN_FILES=()
SIGNED_DIR=""
KEY_IN=""
OUT_PFX=""
FRIENDLY=""
PFX_PASS="${PFX_PASSWORD:-}"
KEY_PASS="${KEY_PASSWORD:-}"
COMPAT=0        # --compat  : chiffrement legacy (Windows <2016, Java 8, vieux F5)
NO_ROOT=0       # --no-root : ne pas embarquer la CA racine dans le PFX
NO_PASS=0       # --no-pass : PFX sans mot de passe
FORCE=0         # --force   : ecraser un PFX existant

usage() {
  cat <<'EOU'
Usage : make-pfx.sh <fqdn> [fichiers-signes...] [options]

  <fqdn>                  Le meme FQDN que celui passe a generate-csr.sh.
                          Sans autre argument, le script lit tout ce qui se
                          trouve dans <racine>/<fqdn>/Signed/.
  [fichiers-signes...]    Fichiers renvoyes par la PKI, si vous preferez les
                          designer explicitement (PEM/CRT/CER/DER/P7B).

Options :
  -c, --cert FICHIER      Idem positionnel, repetable
  -C, --chain FICHIER     Certificat de CA a ajouter, repetable
  -s, --signed-dir DOSSIER  Dossier des retours PKI (defaut : <fqdn>/Signed)
  -k, --key FICHIER       Cle privee (defaut : <fqdn>/<fqdn>.key.pem)
  -o, --out FICHIER       PFX de sortie (defaut : <fqdn>/<fqdn>.pfx)
  -d, --dir DOSSIER       Racine de travail (defaut : dossier du script,
                          ou $CERT_HOME)
  -n, --name NOM          Friendly name dans le magasin Windows (defaut : fqdn)
  -p, --password MDP      Mot de passe du PFX (sinon demande, ou $PFX_PASSWORD)
      --key-password MDP  Mot de passe de la cle privee si elle est chiffree
      --compat            Chiffrement legacy 3DES/SHA1 (vieux Windows, Java 8)
      --no-root           Exclut la CA racine du PFX
      --no-pass           PFX sans mot de passe
      --force             Ecrase un PFX existant sans demander
  -h, --help              Cette aide

Exemples :
  ./make-pfx.sh www.exemple.fr
  ./make-pfx.sh api.exemple.fr signed.p7b
  ./make-pfx.sh api.exemple.fr cert.cer -C intermediate.cer -C root.cer
  ./make-pfx.sh api.exemple.fr --no-root --compat -p 'MonSecret'
EOU
}

die() { echo "ERREUR : $*" >&2; exit 1; }
ok()  { echo "  [OK] $*"; }

# --------------------------------------------------------------------------
# Analyse des arguments : le 1er positionnel est le FQDN, les suivants des
# fichiers signes.
# --------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    -c|--cert)         INPUTS+=("$2"); shift 2 ;;
    -C|--chain)        CHAIN_FILES+=("$2"); shift 2 ;;
    -s|--signed-dir)   SIGNED_DIR="$2"; shift 2 ;;
    -k|--key)          KEY_IN="$2"; shift 2 ;;
    -o|--out)          OUT_PFX="$2"; shift 2 ;;
    -d|--dir)          ROOT_DIR="$2"; shift 2 ;;
    -n|--name)         FRIENDLY="$2"; shift 2 ;;
    -p|--password)     PFX_PASS="$2"; shift 2 ;;
    --key-password)    KEY_PASS="$2"; shift 2 ;;
    --compat)          COMPAT=1; shift ;;
    --no-root)         NO_ROOT=1; shift ;;
    --no-pass)         NO_PASS=1; shift ;;
    --force)           FORCE=1; shift ;;
    -h|--help)         usage; exit 0 ;;
    -*)                echo "Option inconnue : $1" >&2; usage; exit 1 ;;
    *)
      if [[ -z "$FQDN" ]]; then FQDN="$1"; else INPUTS+=("$1"); fi
      shift ;;
  esac
done

[[ -n "$FQDN" ]] || { usage; exit 1; }
command -v openssl >/dev/null || die "openssl introuvable dans le PATH"

# --------------------------------------------------------------------------
# Chemins : les metadonnees laissees par generate-csr.sh font foi,
# les options de la ligne de commande les emportent.
# --------------------------------------------------------------------------
WORK="$ROOT_DIR/$FQDN"
META="$WORK/$FQDN.meta"
META_SANS=""
if [[ -f "$META" ]]; then
  # Lecture ligne a ligne (pas de "source" : le fichier n'est pas du code)
  META_KEY=""; META_SIGNED=""
  unquote() { local v="${1#*=}"; v="${v%\"}"; printf '%s' "${v#\"}"; }
  while IFS= read -r line; do
    case "$line" in
      KEY=*)        META_KEY="$(unquote "$line")" ;;
      SIGNED_DIR=*) META_SIGNED="$(unquote "$line")" ;;
      SANS=*)       META_SANS="$(unquote "$line")" ;;
    esac
  done < "$META"
  [[ -z "$KEY_IN"     && -n "$META_KEY"    ]] && KEY_IN="$META_KEY"
  [[ -z "$SIGNED_DIR" && -n "$META_SIGNED" ]] && SIGNED_DIR="$META_SIGNED"
fi

KEY_IN="${KEY_IN:-$WORK/$FQDN.key.pem}"
SIGNED_DIR="${SIGNED_DIR:-$WORK/Signed}"
OUT_PFX="${OUT_PFX:-$WORK/$FQDN.pfx}"
FRIENDLY="${FRIENDLY:-$FQDN}"
CSR_FILE="$WORK/$FQDN.csr"

[[ -f "$KEY_IN" ]] || die "cle privee introuvable : $KEY_IN
       Verifiez le FQDN, ou indiquez la cle avec -k."
if [[ ${#INPUTS[@]} -eq 0 && ! -d "$SIGNED_DIR" ]]; then
  die "aucun fichier signe indique et dossier introuvable : $SIGNED_DIR
       Deposez-y les fichiers de la PKI, ou passez-les en argument."
fi
if [[ -f "$OUT_PFX" && "$FORCE" -eq 0 ]]; then
  read -r -p "$OUT_PFX existe deja. L'ecraser ? [o/N] " rep
  [[ "$rep" =~ ^[oOyY]$ ]] || die "abandon"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "FQDN    : $FQDN"
echo "Cle     : $KEY_IN"
echo "Retours : ${SIGNED_DIR}"
echo

# --------------------------------------------------------------------------
# Normalisation : quel que soit le format d'entree -> flux PEM sur stdout
# --------------------------------------------------------------------------
to_pem() {
  local f="$1"
  if grep -qa -- "-----BEGIN CERTIFICATE-----" "$f"; then
    awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/' "$f"
  elif grep -qa -- "-----BEGIN PKCS7-----" "$f"; then
    openssl pkcs7 -in "$f" -print_certs 2>/dev/null \
      | awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/'
  elif openssl x509 -inform DER -in "$f" -noout 2>/dev/null; then
    openssl x509 -inform DER -in "$f"
  elif openssl pkcs7 -inform DER -in "$f" -print_certs -noout 2>/dev/null; then
    openssl pkcs7 -inform DER -in "$f" -print_certs 2>/dev/null \
      | awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/'
  else
    return 1
  fi
}

# add_source <fichier> <strict:0|1>
add_source() {
  local f="$1" strict="$2" pem n
  if ! pem="$(to_pem "$f")" || [[ -z "$pem" ]]; then
    if [[ "$strict" -eq 1 ]]; then
      die "format non reconnu (ni PEM, ni DER, ni PKCS#7) : $f"
    fi
    echo "  [ignore] $(basename "$f") : ni PEM, ni DER, ni PKCS#7"
    return 0
  fi
  n="$(grep -c -- "-----BEGIN CERTIFICATE-----" <<<"$pem" || true)"
  printf '%s\n' "$pem" >> "$ALL"
  echo "  + $(basename "$f") : $n certificat(s)"
}

echo "== 1. Lecture des certificats =============================="
ALL="$TMP/all.pem"
: > "$ALL"

if [[ ${#INPUTS[@]} -gt 0 ]]; then
  for f in "${INPUTS[@]}"; do
    [[ -f "$f" ]] || die "fichier introuvable : $f"
    add_source "$f" 1
  done
else
  echo "  Auto-detection dans $SIGNED_DIR/"
  found=0
  for f in "$SIGNED_DIR"/*; do
    [[ -f "$f" ]] || continue
    found=1
    add_source "$f" 0
  done
  [[ "$found" -eq 1 ]] || die "aucun fichier dans $SIGNED_DIR"
fi

for f in "${CHAIN_FILES[@]}"; do
  [[ -f "$f" ]] || die "fichier de chaine introuvable : $f"
  add_source "$f" 1
done

# Eclatement en un fichier par certificat
awk -v d="$TMP" '
  /-----BEGIN CERTIFICATE-----/ { n++; f = sprintf("%s/c%03d.pem", d, n) }
  n > 0 { print > f }
' "$ALL"

CERTS=()
for c in "$TMP"/c*.pem; do
  [[ -e "$c" ]] && CERTS+=("$c")
done
[[ ${#CERTS[@]} -gt 0 ]] || die "aucun certificat trouve dans les fichiers fournis"

# Deduplication (les fichiers d'un meme retour PKI se recouvrent largement)
declare -A SEEN=()
UNIQ=()
for c in "${CERTS[@]}"; do
  fp="$(openssl x509 -in "$c" -noout -fingerprint -sha256 2>/dev/null | cut -d= -f2)"
  [[ -n "$fp" ]] || die "certificat illisible extrait des fichiers fournis"
  [[ -n "${SEEN[$fp]:-}" ]] && continue
  SEEN["$fp"]=1
  UNIQ+=("$c")
done
NB_TOTAL=${#CERTS[@]}
CERTS=("${UNIQ[@]}")
ok "${#CERTS[@]} certificat(s) distinct(s) sur $NB_TOTAL lus"

# --------------------------------------------------------------------------
# Identification de la feuille : celle dont la cle publique = notre cle privee
# --------------------------------------------------------------------------
echo
echo "== 2. Correspondance cle privee / certificat ==============="
KEYARGS=()
if grep -qa "ENCRYPTED" "$KEY_IN"; then
  if [[ -z "$KEY_PASS" ]]; then
    read -r -s -p "Mot de passe de la cle privee : " KEY_PASS
    echo
  fi
  KEYARGS=(-passin "pass:$KEY_PASS")
fi

KEY_HASH="$(openssl pkey -in "$KEY_IN" "${KEYARGS[@]}" -pubout 2>/dev/null | openssl sha256 | awk '{print $NF}')"
[[ -n "$KEY_HASH" ]] || die "cle privee illisible (mot de passe ?) : $KEY_IN"

LEAF=""
for c in "${CERTS[@]}"; do
  h="$(openssl x509 -in "$c" -noout -pubkey | openssl sha256 | awk '{print $NF}')"
  if [[ "$h" == "$KEY_HASH" ]]; then LEAF="$c"; break; fi
done
if [[ -z "$LEAF" ]]; then
  die "aucun certificat fourni ne correspond a la cle privee $KEY_IN.
       La PKI a peut-etre signe une autre CSR, ou la cle a ete regeneree depuis."
fi
ok "certificat serveur identifie, il correspond bien a la cle privee"

# --------------------------------------------------------------------------
# Reconstruction ordonnee de la chaine : feuille -> intermediaires -> racine
# --------------------------------------------------------------------------
echo
echo "== 3. Reconstruction de la chaine =========================="
subj_of()   { openssl x509 -in "$1" -noout -subject -nameopt RFC2253 | sed 's/^subject=//'; }
issuer_of() { openssl x509 -in "$1" -noout -issuer  -nameopt RFC2253 | sed 's/^issuer=//'; }

CHAIN=()
current="$LEAF"
used=" $LEAF "
while :; do
  iss="$(issuer_of "$current")"
  [[ "$iss" == "$(subj_of "$current")" ]] && break        # auto-signe : racine atteinte
  next=""
  for c in "${CERTS[@]}"; do
    [[ "$used" == *" $c "* ]] && continue
    if [[ "$(subj_of "$c")" == "$iss" ]]; then next="$c"; break; fi
  done
  [[ -n "$next" ]] || break
  if [[ "$NO_ROOT" -eq 1 && "$(subj_of "$next")" == "$(issuer_of "$next")" ]]; then
    echo "  (CA racine exclue : --no-root)"
    break
  fi
  CHAIN+=("$next")
  used+="$next "
  current="$next"
done

echo "  Feuille       : $(subj_of "$LEAF")"
for c in "${CHAIN[@]}"; do
  if [[ "$(subj_of "$c")" == "$(issuer_of "$c")" ]]; then
    echo "  CA racine     : $(subj_of "$c")"
  else
    echo "  CA intermed.  : $(subj_of "$c")"
  fi
done
for c in "${CERTS[@]}"; do
  [[ "$used" == *" $c "* ]] && continue
  echo "  (non utilise) : $(subj_of "$c")"
done

if [[ ${#CHAIN[@]} -gt 0 ]]; then top="${CHAIN[${#CHAIN[@]}-1]}"; else top="$LEAF"; fi
if [[ "$NO_ROOT" -eq 0 && "$(subj_of "$top")" != "$(issuer_of "$top")" ]]; then
  echo "  [!] Chaine incomplete : emetteur manquant -> $(issuer_of "$top")"
  echo "      Ajoutez le certificat de CA correspondant avec -C <fichier>."
fi

CHAINPEM="$TMP/chain.pem"
: > "$CHAINPEM"
for c in "${CHAIN[@]}"; do
  cat "$c" >> "$CHAINPEM"
done

# --------------------------------------------------------------------------
# Controles
# --------------------------------------------------------------------------
echo
echo "== 4. Controles ==========================================="
openssl x509 -in "$LEAF" -noout -subject -issuer -serial -dates -nameopt RFC2253 | sed 's/^/  /'
SAN="$(openssl x509 -in "$LEAF" -noout -ext subjectAltName 2>/dev/null | tail -n +2 | tr -d ' ' || true)"
echo "  SAN     : ${SAN:-(aucun)}"
EKU="$(openssl x509 -in "$LEAF" -noout -ext extendedKeyUsage 2>/dev/null | tail -n +2 | tr -d ' ' || true)"
echo "  EKU     : ${EKU:-(aucun)}"

# openssl affiche "IPAddress:", generate-csr.sh ecrit "IP:" : on aligne.
SAN_CMP="${SAN//IPAddress:/IP:}"
if [[ "$SAN_CMP" == *"DNS:$FQDN"* || "$SAN_CMP" == *"IP:$FQDN"* ]]; then
  ok "le SAN couvre bien $FQDN"
else
  echo "  [!] Le SAN ne contient pas $FQDN - les navigateurs refuseront le certificat."
fi

# Les SAN demandes dans la CSR ont-ils tous ete delivres ?
if [[ -n "$META_SANS" ]]; then
  for want in $META_SANS; do
    [[ "$SAN_CMP" == *"$want"* ]] || echo "  [!] SAN demande mais absent du certificat : $want"
  done
fi

if openssl x509 -in "$LEAF" -noout -checkend 0 >/dev/null 2>&1; then
  END_DATE="$(openssl x509 -in "$LEAF" -noout -enddate | cut -d= -f2)"
  if END_TS="$(date -d "$END_DATE" +%s 2>/dev/null)"; then
    ok "certificat valide, expire dans $(( (END_TS - $(date +%s)) / 86400 )) jour(s)"
  else
    ok "certificat valide jusqu'au $END_DATE"
  fi
else
  echo "  [!] Le certificat est EXPIRE ou pas encore valide."
fi

if [[ -s "$CHAINPEM" ]]; then
  if openssl verify -partial_chain -CAfile "$CHAINPEM" "$LEAF" >/dev/null 2>&1; then
    ok "chaine de confiance verifiee"
  else
    echo "  [!] openssl verify echoue :"
    openssl verify -partial_chain -CAfile "$CHAINPEM" "$LEAF" 2>&1 | sed 's/^/      /'
  fi
fi

if [[ -f "$CSR_FILE" ]]; then
  CSR_HASH="$(openssl req -in "$CSR_FILE" -noout -pubkey | openssl sha256 | awk '{print $NF}')"
  if [[ "$CSR_HASH" == "$KEY_HASH" ]]; then
    ok "meme cle publique que la CSR $(basename "$CSR_FILE")"
  fi
  CSR_SUBJ="$(openssl req -in "$CSR_FILE" -noout -subject -nameopt RFC2253 | sed 's/^subject=//')"
  if [[ "$CSR_SUBJ" != "$(subj_of "$LEAF")" ]]; then
    echo "  [i] La PKI a reecrit le DN (elle impose son template, c'est normal) :"
    echo "      demande : $CSR_SUBJ"
    echo "      delivre : $(subj_of "$LEAF")"
  fi
fi

# --------------------------------------------------------------------------
# Export PKCS#12
# --------------------------------------------------------------------------
echo
echo "== 5. Export du PFX ======================================="
if [[ "$NO_PASS" -eq 1 ]]; then
  PASSOUT="pass:"
else
  if [[ -z "$PFX_PASS" ]]; then
    read -r -s -p "Mot de passe a poser sur le PFX : " PFX_PASS
    echo
    read -r -s -p "Confirmation                    : " PFX_PASS2
    echo
    [[ "$PFX_PASS" == "$PFX_PASS2" ]] || die "les mots de passe ne correspondent pas"
    [[ -n "$PFX_PASS" ]] || die "mot de passe vide (utilisez --no-pass si c'est voulu)"
  fi
  PASSOUT="pass:$PFX_PASS"
fi

P12ARGS=(-export -inkey "$KEY_IN" -in "$LEAF" -name "$FRIENDLY"
         -out "$OUT_PFX" -passout "$PASSOUT")
if [[ -s "$CHAINPEM" ]];      then P12ARGS+=(-certfile "$CHAINPEM"); fi
if [[ ${#KEYARGS[@]} -gt 0 ]]; then P12ARGS+=("${KEYARGS[@]}"); fi
if [[ "$COMPAT" -eq 1 ]]; then
  P12ARGS+=(-legacy -certpbe PBE-SHA1-3DES -keypbe PBE-SHA1-3DES -macalg sha1)
else
  P12ARGS+=(-certpbe AES-256-CBC -keypbe AES-256-CBC -macalg sha256)
fi

mkdir -p "$(dirname "$OUT_PFX")"
openssl pkcs12 "${P12ARGS[@]}"
chmod 600 "$OUT_PFX" 2>/dev/null || true
ok "PFX ecrit : $OUT_PFX"

# Sous-produits (nginx, Apache, HAProxy, F5...)
BASE="$(dirname "$OUT_PFX")/$FQDN"
cp "$LEAF" "$BASE.crt.pem"
if [[ -s "$CHAINPEM" ]]; then
  cp "$CHAINPEM" "$BASE.chain.pem"
  cat "$LEAF" "$CHAINPEM" > "$BASE.fullchain.pem"
fi

# --------------------------------------------------------------------------
# Relecture du PFX produit
# --------------------------------------------------------------------------
echo
echo "== 6. Relecture du PFX ===================================="
RARGS=(-in "$OUT_PFX" -passin "$PASSOUT" -nokeys)
if [[ "$COMPAT" -eq 1 ]]; then RARGS+=(-legacy); fi
NB="$(openssl pkcs12 "${RARGS[@]}" 2>/dev/null | grep -c "BEGIN CERTIFICATE" || true)"
openssl pkcs12 "${RARGS[@]}" -noout -info 2>&1 | sed 's/^/  /'
ok "$NB certificat(s) + 1 cle privee dans le conteneur"

echo
echo "Termine."
echo "  PFX        : $OUT_PFX"
echo "  Certificat : $BASE.crt.pem"
if [[ -s "$CHAINPEM" ]]; then
  echo "  Chaine     : $BASE.chain.pem"
  echo "  Fullchain  : $BASE.fullchain.pem  (nginx / HAProxy)"
fi
echo
echo "Import Windows :"
echo "  Import-PfxCertificate -FilePath '$OUT_PFX' -CertStoreLocation Cert:\\LocalMachine\\My -Password (Read-Host -AsSecureString)"
