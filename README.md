
# Feature-Rich-Onebox-for-Emails


# 📬 Feature-Rich Onebox Email Aggregator

A full-stack, intelligent **Onebox Email Aggregator**, inspired by tools like **Reachinbox**. This system allows users to connect multiple IMAP email accounts, sync emails in real-time, search them with Elasticsearch, auto-categorize with AI, receive Slack/webhook alerts, and even generate smart reply suggestions.

> 🚀 Built with Node.js, TypeScript, Docker, Elasticsearch, OpenAI, and IMAP.

---

## 🔧 Features Overview

### ✅ 1. Real-Time Email Synchronization
- Connects multiple IMAP email accounts (e.g., Gmail).
- Uses **IDLE mode** to maintain persistent connections (no cron jobs!).
- On startup, pulls emails from the **last 30 days**.
- Automatically updates inbox as new emails arrive.

### 🔍 2. Searchable Storage with Elasticsearch
- Emails are indexed into a **local Elasticsearch** container.
- Enables powerful **search by subject, sender, content, folder, or account**.
- Scalable and responsive even with large volumes of email data.

### 🧠 3. AI-Based Email Categorization
- Integrates **OpenAI** to classify emails into:
  - Interested
  - Meeting Booked
  - Not Interested
  - Spam
  - Out of Office
- AI labels are stored and shown on the frontend.

### 🔔 4. Slack & Webhook Integration
- Real-time **Slack notifications** when an email is marked as **Interested**.
- Also triggers a **Webhook** (e.g., using [webhook.site](https://webhook.site)) to allow external integrations like CRMs or automation tools.

### 🖥️ 5. Frontend Interface
- A simple HTML + JS UI that:
  - Lists emails.
  - Supports **filtering by account & folder**.
  - Displays AI-generated categories.
  - Includes a **search bar** powered by Elasticsearch.

### 💬 6. AI-Powered Suggested Replies
- Uses **RAG (Retrieval-Augmented Generation)** for generating smart replies.
- Stores product context in a **vector database**.
- For relevant incoming emails, suggests context-aware responses like:
  > “You can book a slot here: [Calendar Link]”

---

## 🛠 Tech Stack

| Layer        | Tools Used                                   |
|--------------|----------------------------------------------|
| Backend      | Node.js, Express, TypeScript                 |
| Email Sync   | IMAP (node-imap), IDLE mode                  |
| Search       | Elasticsearch (Docker-based)                |
| AI/NLP       | OpenAI API, RAG, Vector DB (e.g., FAISS)     |
| Notifications| Slack API, Webhook.site                      |
| Frontend     | HTML, CSS, JavaScript                        |

---
