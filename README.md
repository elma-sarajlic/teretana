# FitCoach - Fitness Dashboard  🚀

Moderna web platforma za fitness trenerice i njihove klijentice. Omogućava automatizaciju planiranja treninga, praćenje napretka i biblioteku vježbi sa video instrukcijama.

## ✨ Glavne Funkcije

### Za Trenerice
- **Dashboard**: Pregled ključnih metrika.
- **Upravljanje Klijenticama**: Kreiranje profila, praćenje mjera i napomena.
- **Interaktivni Kalendar**: Zakazivanje termina i praćenje rasporeda.
- **Biblioteka Vježbi**: Baza vježbi sa slikama i MP4 klipovima za lakšu demonstraciju.
- **Viber Integracija**: Brzo slanje obavijesti klijenticama o novim treninzima.

### Za Klijentice
- **Lični Profil**: Pregled dodijeljenih treninga.
- **Video Instrukcije**: Prikaz svake vježbe direktno na mobitelu.
- **Potvrda Treninga**: Mogućnost unosa feedbacka, težine i zadovoljstva.
- **Praćenje Mjera**: Unos visine i težine radi praćenja napretka.

## 🛠 Tehnologije
- **React (Vite)**
- **Firebase** (Auth, Firestore, Storage)
- **Lucide React** (Ikonice)
- **React Hot Toast** (Notifikacije)
- **Framer Motion** (Animacije)
- **Date-fns** (Kalendar)

## 🚀 Postavljanje (Setup)

### 1. Firebase Konfiguracija
Morate kreirati Firebase projekat na [Firebase Konzoli](https://console.firebase.google.com).
1. Omogućite **Authentication** (Email/Password).
2. Omogućite **Firestore Database** (u testnom modu za početak).
3. Kopirajte vaše API ključeve u datoteku `src/firebase/config.js`.

### 2. Instalacija
Pokrenite sljedeće komande u terminalu:
```bash
npm install
npm run dev
```

### 3. Objava na GitHub Pages
Projekat je spreman za GitHub Pages. Možete koristiti `gh-pages` paket ili GitHub Actions.
Preporučeno:
```bash
npm install gh-pages --save-dev
```
U `package.json` dodajte:
`"homepage": "https://vas-username.github.io/ime-repozitorija"`

## 🎨 Dizajn System
Aplikacija koristi tamnu temu sa akcentom na `#f0522a` (Fit Orange). 
Fontovi: **Bebas Neue** za naslove i **DM Sans** za tekst.

---
*Projekat razvijen prema zahtjevu fitness trenerice za automatizaciju posla.*
