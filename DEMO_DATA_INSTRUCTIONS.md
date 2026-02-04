# Instructions pour Créer les Données Démo Optométriste

## 📋 Vue d'ensemble

Ce script crée un compte démo complet pour un optométriste avec toutes les données en français, parfait pour présenter le système à des clients potentiels.

## 🚀 Comment Exécuter

### Option 1: Via l'API (Recommandé)

1. Connectez-vous à votre application
2. Visitez: `https://votre-app.vercel.app/api/admin/create-optometrist-demo`
3. Ou utilisez curl:
```bash
curl -X POST https://votre-app.vercel.app/api/admin/create-optometrist-demo \
  -H "Cookie: votre-session-cookie"
```

### Option 2: Via Terminal (Local)

```bash
npx tsx scripts/create-optometrist-demo.ts
```

**Note:** Nécessite `DATABASE_URL` dans votre `.env`

## 📊 Ce qui sera créé

### Compte Utilisateur
- **Email:** `optometriste@demo.nexrel.com`
- **Mot de passe:** `DemoOptometrist2024!`
- **Nom:** Dr. Marie-Claire Optométriste
- **Langue:** Français (fr)
- **Industrie:** Optométrie

### Données Créées

1. **10 Contacts/Leads** - Patients avec noms français
2. **5 Notes** - Notes de suivi en français
3. **4 Transactions (Deals)** - Examen + Lunettes
4. **3 Appels** - Avec transcriptions en français
5. **5 Messages** - Communications SMS en français
6. **1 Campagne SMS** - "Rappel examens annuels"
7. **1 Workflow** - "Suivi post-examen" avec 3 actions
8. **5 Avis** - Avis Google en français (4-5 étoiles)
9. **3 Références** - Patients qui ont référé d'autres patients
10. **5 Rendez-vous** - Examen de la vue programmés
11. **3 Sessions Docpen** - Sessions optométriste avec diagnostics
12. **4 Paiements** - Transactions réussies (350-500 CAD)
13. **3 Tâches** - Tâches de suivi en français

## 🏷️ Marquage des Données

Toutes les données créées sont marquées avec:
- **Tag:** `MOCK_DATA`
- **Tag:** `DEMO_DATA` (sur les leads)
- **Tag:** `PATIENT` (sur les leads)

Cela permet de:
- Identifier facilement les données de démo
- Les supprimer en masse si nécessaire
- Les filtrer dans les vues

## 🌐 Langue

- **Langue de l'application:** Français (fr)
- **Tous les contenus:** En français
- **Noms:** Noms français québécois
- **Adresses:** Montréal, QC, Canada

## 🔍 Vérification

Après exécution, vous pouvez vérifier:
- Dashboard: Devrait afficher des statistiques
- AI Brain: Devrait montrer des données réelles
- Contacts: 10 contacts avec tag MOCK_DATA
- Messages: 5 conversations SMS
- Reviews: 5 avis Google
- Docpen: 3 sessions optométriste

## 🗑️ Suppression des Données Démo

Pour supprimer toutes les données démo:

```sql
-- Supprimer toutes les données avec le tag MOCK_DATA
DELETE FROM "Lead" WHERE tags::text LIKE '%MOCK_DATA%';
DELETE FROM "Deal" WHERE tags LIKE '%MOCK_DATA%';
DELETE FROM "CallLog" WHERE metadata::text LIKE '%MOCK_DATA%';
DELETE FROM "Message" WHERE messageType = 'SMS' AND leadId IN (
  SELECT id FROM "Lead" WHERE tags::text LIKE '%MOCK_DATA%'
);
-- etc.
```

Ou utilisez Prisma Studio pour filtrer et supprimer.

## ⚠️ Notes Importantes

1. **Ne pas utiliser en production** sans protection appropriée
2. **Les données sont réalistes** mais fictives
3. **Tous les emails/téléphones** sont des exemples
4. **Le compte utilisateur** peut être utilisé pour des démos

## 📝 Exemple d'Utilisation

```bash
# 1. Exécuter le script
npx tsx scripts/create-optometrist-demo.ts

# 2. Se connecter avec:
# Email: optometriste@demo.nexrel.com
# Password: DemoOptometrist2024!

# 3. Explorer les données dans l'interface
```

## ✅ Résultat Attendu

Après exécution, vous devriez voir:
```
✅✅✅ Données démo créées avec succès! ✅✅✅

📋 Résumé:
   👤 Utilisateur: optometriste@demo.nexrel.com
   🔑 Mot de passe: DemoOptometrist2024!
   📇 Contacts: 10
   📞 Appels: 3
   💬 Messages: 5
   📱 Campagne SMS: 1
   ⚙️ Workflow: 1
   ⭐ Avis: 5
   👥 Références: 3
   📅 Rendez-vous: 5
   🏥 Sessions Docpen: 3
   💳 Paiements: 4
   ✅ Tâches: 3

🏷️ Toutes les données sont taguées avec: MOCK_DATA
🌐 Langue: Français (fr)
```
