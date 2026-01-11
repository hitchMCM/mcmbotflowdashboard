# Configuration de la Base de Données - Messages Multi-Pages

## 📋 Vue d'ensemble

Ce projet permet de **créer des messages globaux** qui sont **accessibles à toutes les pages Facebook** connectées. Chaque page peut utiliser tous les messages disponibles.

## 🎯 Fonctionnalités

- ✅ **Messages Globaux** : Un seul pool de messages pour toutes les pages
- ✅ **Welcome Messages** : Messages de bienvenue avec sélection aléatoire pondérée
- ✅ **Responses** : Réponses automatiques aux messages
- ✅ **Sequences** : Séquences de messages automatisés
- ✅ **Broadcasts** : Messages de diffusion groupés
- ✅ **Configuration par Page** : Chaque page peut choisir mode aléatoire ou message fixe

## 🚀 Installation des Migrations

### Étape 1: Accéder à Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Connectez-vous à votre projet: **btujycztangypsraqfdw**
3. Cliquez sur **SQL Editor** dans le menu de gauche

### Étape 2: Exécuter la Migration 1 (Pools de Messages)

1. Dans le SQL Editor, créez une nouvelle requête
2. Copiez **tout le contenu** du fichier:
   ```
   supabase/migrations/20260106_multi_page_message_pools.sql
   ```
3. Collez-le dans l'éditeur SQL
4. Cliquez sur **RUN** (ou appuyez sur Ctrl+Enter)
5. Vérifiez qu'il n'y a pas d'erreurs

**Ce que cette migration fait:**
- Crée la table `welcome_messages` pour les messages de bienvenue
- Ajoute le flag `is_global` aux tables existantes (response_messages, sequences, broadcasts)
- Crée des fonctions pour sélection aléatoire pondérée
- Ajoute des statistiques (sent_count, delivered_count, read_count)

### Étape 3: Exécuter la Migration 2 (Configuration par Page)

1. Dans le SQL Editor, créez une nouvelle requête
2. Copiez **tout le contenu** du fichier:
   ```
   supabase/migrations/20260107_page_message_configuration.sql
   ```
3. Collez-le dans l'éditeur SQL
4. Cliquez sur **RUN**
5. Vérifiez qu'il n'y a pas d'erreurs

**Ce que cette migration fait:**
- Crée les tables de configuration par page (page_welcome_config, etc.)
- Crée des fonctions pour obtenir le message approprié pour chaque page
- Permet de choisir entre mode "random" (aléatoire) ou "fixed" (message fixe)
- Crée des vues pour faciliter la lecture de la configuration

### Étape 4: Vérifier l'Installation

Exécutez cette requête dans le SQL Editor:

```sql
-- Vérifier que toutes les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'welcome_messages',
    'page_welcome_config',
    'page_response_config',
    'page_sequence_config',
    'page_broadcast_config'
  )
ORDER BY table_name;
```

Vous devriez voir **5 tables** dans le résultat.

### Étape 5: Ajouter vos Pages Facebook (Optionnel)

Si vous avez déjà des pages Facebook, ajoutez-les:

```sql
-- Exemple: Ajouter une page Facebook
INSERT INTO pages (name, page_id, access_token, avatar_url)
VALUES 
  ('Ma Page Facebook 1', 'FB_PAGE_ID_1', 'FB_ACCESS_TOKEN_1', 'https://...'),
  ('Ma Page Facebook 2', 'FB_PAGE_ID_2', 'FB_ACCESS_TOKEN_2', 'https://...');
```

## 📖 Utilisation dans l'Application

Une fois les migrations exécutées, l'application offre:

### 1. Création de Messages Globaux

Allez dans chaque section pour créer des messages:
- **Welcome** → Créer des messages de bienvenue
- **Responses** → Créer des réponses automatiques
- **Sequences** → Créer des séquences
- **Broadcasts** → Créer des diffusions

**Tous ces messages seront disponibles pour TOUTES les pages.**

### 2. Configuration par Page

Allez dans **Configuration** (menu latéral):
- Sélectionnez une page dans le sélecteur en haut
- Pour chaque type de message (Welcome, Responses, Sequences, Broadcasts):
  - **Mode Random**: Sélection aléatoire parmi tous les messages disponibles
  - **Mode Fixed**: Utiliser toujours le même message spécifique

### 3. Fonctionnement

Quand un utilisateur Facebook interagit:
1. Le système identifie la page Facebook
2. Vérifie la configuration de cette page
3. Si mode "Random": Choisit aléatoirement parmi les messages avec poids
4. Si mode "Fixed": Utilise toujours le message configuré

## 🔍 Exemple de Workflow

```
1. Créer 5 messages de bienvenue différents
   → Tous marqués comme "is_global = true"

2. Page "Restaurant Paris" → Mode Random
   → Enverra un message aléatoire parmi les 5

3. Page "Restaurant Lyon" → Mode Fixed (Message #3)
   → Enverra toujours le Message #3

4. Page "Restaurant Marseille" → Mode Random
   → Enverra un message aléatoire parmi les 5
```

## ⚠️ Important

- Les migrations sont **idempotentes** (peuvent être exécutées plusieurs fois sans problème)
- Les données existantes sont **préservées**
- Les champs sont ajoutés avec `IF NOT EXISTS` pour éviter les erreurs
- Tous les nouveaux messages sont **globaux par défaut** (`is_global = true`)

## 🆘 En cas d'Erreur

Si vous rencontrez une erreur lors de l'exécution:

1. **Erreur "relation already exists"**: Ignorez, cela signifie que la table existe déjà
2. **Erreur "column already exists"**: Ignorez, le champ existe déjà
3. **Autre erreur**: Copiez le message d'erreur et demandez de l'aide

## 📞 Support

Pour toute question sur la configuration, vérifiez:
- Le fichier `MULTI_PAGE_ARCHITECTURE.md` pour la documentation complète
- Les fichiers de migration dans `supabase/migrations/`
