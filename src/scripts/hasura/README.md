# Hasura Configuration Scripts

Ces scripts configurent automatiquement les relations GraphQL et les permissions dans Hasura pour que l'indexer fonctionne correctement.

## Scripts disponibles

### 1. `setup-hasura.js` (Script principal)
Exécute tous les scripts de configuration dans l'ordre :
- Crée les relations GraphQL (sans contraintes SQL)
- Rend les tables publiquement accessibles

```bash
npm run setup-hasura
```

### 2. `setup-relations-simple.js`
Crée les relations GraphQL dans Hasura sans contraintes de clés étrangères SQL :

- `Player.heroes` (one-to-many)
- `Player.weapons` (one-to-many)
- `Hero.owner` (many-to-one)
- `Hero.equippedWeapon` (one-to-one)
- `Weapon.owner` (many-to-one)
- `Weapon.equippedBy` (one-to-many)
- `Activity.hero` (many-to-one)
- `Hero.activities` (one-to-many)
- Stats entities → `Player`

```bash
npm run setup-relations
```

### 3. `public-tables.js`
Rend toutes les tables publiquement accessibles pour les requêtes GraphQL.

```bash
npm run setup-public-tables
```

## Relations configurées

### Player ↔ Hero
```graphql
type Player {
  heroes: [Hero!]! @derivedFrom(field: "owner")
}

type Hero {
  owner: Player!
}
```

### Player ↔ Weapon
```graphql
type Player {
  weapons: [Weapon!]! @derivedFrom(field: "owner")
}

type Weapon {
  owner: Player!
}
```

### Hero ↔ Weapon (Equipment)
```graphql
type Hero {
  equippedWeapon: Weapon @oneToOne
}

type Weapon {
  equippedBy: [Hero!]! @derivedFrom(field: "equippedWeapon")
}
```

### Hero ↔ Activity
```graphql
type Hero {
  activities: [Activity!]! @derivedFrom(field: "hero")
}

type Activity {
  hero: Hero @index
}
```

## Utilisation dans CI/CD

Ajoutez ces commandes à votre pipeline CI/CD :

```yaml
# Exemple pour GitHub Actions
- name: Setup Hasura Configuration
  run: |
    npm run setup-hasura
```

## Dépannage

### Erreurs courantes

1. **"Relation already exists"** : Normal, la relation existe déjà
2. **"Table not found"** : Vérifiez que l'indexer a créé les tables
3. **"Foreign key constraint"** : Non supporté dans cette version de Hasura

### Vérification

Après exécution, vous devriez pouvoir faire des requêtes comme :

```graphql
query {
  player(id: "0x123...") {
    heroes {
      id
      level
      equippedWeapon {
        id
        rarity
      }
    }
    weapons {
      id
      rarity
      equippedHeroId
    }
  }
}
```

## Configuration

Les scripts utilisent ces variables d'environnement :
- `HASURA_ENDPOINT` : URL de l'endpoint Hasura
- `HASURA_ADMIN_SECRET` : Clé secrète admin Hasura

Ces valeurs sont actuellement codées en dur dans les scripts mais peuvent être externalisées si nécessaire.

## Notes importantes

- **Pas de contraintes SQL** : Cette version de Hasura ne supporte pas la création de contraintes de clés étrangères via l'API
- **Relations manuelles** : Les relations sont créées avec `manual_configuration` au lieu de `foreign_key_constraint_on`
- **Fonctionnalité complète** : Les relations GraphQL fonctionnent parfaitement sans les contraintes SQL 