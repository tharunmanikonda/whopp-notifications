# Privacy Policy - Whoop AI Motivator

**Last Updated**: November 3, 2024

## Overview

Whoop AI Motivator is a personal health and wellness application that provides AI-powered motivational messages based on your Whoop fitness data. This privacy policy explains how your data is collected, used, and protected.

## Developer Information

This application is developed and operated by an individual for personal use.

## Data Collection

### What Data We Access

This application accesses the following data from your Whoop account via the official Whoop API:

- **Recovery Metrics**: Recovery score, heart rate variability (HRV), resting heart rate (RHR), blood oxygen (SpO2), skin temperature
- **Sleep Data**: Sleep duration, sleep stages, sleep performance, sleep efficiency, respiratory rate
- **Activity Data**: Daily strain score, workout details, heart rate zones
- **Physiological Cycles**: Daily cycle information

### How We Access Your Data

- Data is accessed through the official Whoop Developer API using OAuth 2.0 authentication
- You explicitly authorize this access when setting up the application
- Access can be revoked at any time through your Whoop account settings

## Data Usage

### Primary Purpose

Your Whoop health data is used to:

1. Generate personalized motivational messages using AI
2. Provide health insights and recommendations
3. Answer your health-related questions via interactive chat
4. Send daily SMS notifications with actionable advice

### AI Processing

- Your health data is sent to Google Gemini AI to generate personalized messages
- The AI uses your current metrics to create context-aware, helpful responses
- No personal identifying information beyond health metrics is shared with the AI

## Data Storage

### What We Store

**Short Answer: Nothing permanently.**

- **No Database**: This application does not use a database
- **No Logs**: Conversation history and health data are not stored
- **Real-Time Only**: Health data is fetched fresh from Whoop API each time it's needed
- **No Analytics**: No user analytics or tracking is implemented

### Temporary Data

- Health data is temporarily held in memory during message generation (seconds)
- Data is discarded immediately after SMS is sent
- No caching or persistence of health information

## Third-Party Services

This application uses the following third-party services:

### 1. Whoop API (api.whoop.com)
- **Purpose**: Retrieve your health and fitness data
- **Data Shared**: OAuth access token (with your explicit authorization)
- **Privacy Policy**: [https://www.whoop.com/privacy/](https://www.whoop.com/privacy/)

### 2. Google Gemini AI (Google AI)
- **Purpose**: Generate personalized motivational messages
- **Data Shared**: Your health metrics (recovery score, sleep data, strain)
- **Data Retention**: Per Google's data retention policies for Gemini API
- **Privacy Policy**: [https://ai.google.dev/gemini-api/terms](https://ai.google.dev/gemini-api/terms)

### 3. Twilio (twilio.com)
- **Purpose**: Send SMS notifications to your phone number
- **Data Shared**: Your phone number and message content
- **Privacy Policy**: [https://www.twilio.com/legal/privacy](https://www.twilio.com/legal/privacy)

### 4. Vercel (vercel.com)
- **Purpose**: Host the application and cron jobs
- **Data Shared**: Minimal server logs (may include timestamps and endpoints)
- **Privacy Policy**: [https://vercel.com/legal/privacy-policy](https://vercel.com/legal/privacy-policy)

## Data Security

### Security Measures

- **Encrypted Communication**: All API requests use HTTPS/TLS encryption
- **Credential Protection**: API keys and tokens stored as encrypted environment variables
- **OAuth 2.0**: Industry-standard authentication for Whoop API access
- **Access Tokens**: Short-lived tokens that auto-refresh
- **No Public Exposure**: Your data is never made publicly accessible

### Limitations

- This is a personal application without enterprise-grade security infrastructure
- Security depends on the security of third-party services (Whoop, Gemini, Twilio, Vercel)
- Your phone's SMS security affects message confidentiality

## Your Rights & Control

### You Can:

- **Revoke Access**: Disconnect this app from your Whoop account at any time via Whoop settings
- **Delete Account**: No account exists - simply stop using the application
- **Request Information**: Contact the developer for any questions about data handling
- **Stop SMS**: Stop using the application or block the Twilio phone number

### Data Retention

Since no data is stored:
- There is no data to delete
- There are no backups to remove
- Stopping the application immediately stops all data access

## Children's Privacy

This application is not intended for users under 18 years of age. We do not knowingly collect data from children.

## International Users

- This application can be used internationally
- Data is processed in the United States (where Vercel, Twilio, and Google services operate)
- By using this application, you consent to international data transfer

## Changes to Privacy Policy

- This privacy policy may be updated to reflect changes in data practices
- Last updated date is shown at the top of this document
- Continued use after updates constitutes acceptance of changes

## Open Source

- The source code for this application is available for review
- You can audit how your data is handled by reviewing the code
- No hidden data collection or processing occurs

## Disclaimer

- This application is provided "as is" without warranties
- Health insights are for informational purposes only
- Not a substitute for professional medical advice
- Accuracy depends on Whoop device data quality

## Data Breach Notification

In the unlikely event of a data breach:
- You will be notified promptly via SMS or email
- Steps will be taken to mitigate any harm
- Relevant authorities will be notified as required by law

## Contact Information

For questions, concerns, or requests regarding your privacy:

- **GitHub Issues**: [Your GitHub Repository URL]
- **Email**: [Your Email Address]

## Legal Compliance

This application complies with:
- Whoop API Terms of Use
- Google Gemini API Terms
- Twilio Terms of Service
- Applicable data protection regulations

## Consent

By using Whoop AI Motivator, you consent to:
- Collection of your Whoop health data via official API
- Processing of your data by AI services for message generation
- Delivery of messages via SMS to your provided phone number
- Data practices described in this privacy policy

---

**Your privacy matters.** This application is designed with privacy in mind - no permanent storage, no tracking, no data selling. Your health data is yours, and this tool simply helps you understand it better.

For technical details on data handling, see the project source code.
