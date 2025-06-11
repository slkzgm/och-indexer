#!/bin/sh
# wait-for-hasura.sh

set -e

host="$1"
shift
cmd="$@"

# Boucle jusqu'à ce que le endpoint /healthz de Hasura réponde avec un statut 200
# On utilise curl avec -s (silencieux), -f (échoue en cas d'erreur HTTP) et -o /dev/null (n'affiche pas le corps de la réponse)
until curl -s -f -o /dev/null "$host/healthz"; do
  >&2 echo "Hasura n'est pas encore prêt - on attend 2 secondes..."
  sleep 2
done

>&2 echo "Hasura est prêt - Exécution de la commande de démarrage."
exec $cmd
