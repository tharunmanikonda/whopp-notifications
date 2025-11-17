# Whoop AI Motivator

AI-powered daily motivational messages based on your Whoop health scores. Get personalized SMS messages every day with actionable health insights.

## Features

- **Daily Health Data**: Fetches recovery score, sleep performance, strain, HRV, RHR from Whoop API
- **AI-Generated Messages**: Uses Google Gemini to create personalized motivational messages
- **SMS Notifications**: Sends daily messages via Twilio SMS
- **Interactive Chat**: Text questions to your AI health coach and get instant responses
- **Automated Scheduling**: Runs daily via Vercel Cron Jobs
- **Free Tier Friendly**: Uses free or low-cost services (Gemini free tier, minimal Twilio costs)

## Prerequisites

1. **Whoop Membership** - Active Whoop account with device
2. **Whoop Developer Account** - Sign up at [developer.whoop.com](https://developer.whoop.com)
3. **Google Gemini API Key** - Free tier at [makersuite.google.com](https://makersuite.google.com/app/apikey)
4. **Twilio Account** - Free trial at [twilio.com](https://www.twilio.com/try-twilio)
5. **Vercel Account** - Free tier at [vercel.com](https://vercel.com) (for deployment)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd whopp-notifications
npm run setup
```

### 2. Get Whoop API Credentials

1. Go to [developer.whoop.com/dashboard](https://developer.whoop.com/dashboard)
2. Create a new App
3. Copy your **Client ID** and **Client Secret**
4. Set redirect URI to `http://localhost:5000/callback`
5. Complete OAuth flow to get **Access Token** and **Refresh Token**

**OAuth Flow (Manual)**:
```bash
# 1. Visit this URL in browser (replace CLIENT_ID):
https://api.whoop.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:5000/callback&response_type=code&scope=read:recovery read:sleep read:workout read:cycles

# 2. After authorization, you'll be redirected to:
http://localhost:5000/callback?code=YOUR_AUTH_CODE

# 3. Exchange code for tokens:
curl -X POST https://api.whoop.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "YOUR_AUTH_CODE",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uri": "http://localhost:5000/callback"
  }'

# 4. Copy access_token and refresh_token from response
```

### 3. Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

### 4. Get Twilio Credentials

1. Sign up at [Twilio](https://www.twilio.com/try-twilio)
2. Get free trial credits ($15)
3. Copy **Account SID** and **Auth Token** from console
4. Get a Twilio phone number (free with trial)
5. Verify your personal phone number in Twilio

### 5. Configure Environment Variables

Edit `.env` file with your credentials:

```env
# Whoop API
WHOOP_CLIENT_ID=your_client_id
WHOOP_CLIENT_SECRET=your_client_secret
WHOOP_ACCESS_TOKEN=your_access_token
WHOOP_REFRESH_TOKEN=your_refresh_token

# Google Gemini
GEMINI_API_KEY=your_gemini_key

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
YOUR_PHONE_NUMBER=+1234567890

# User Preferences
USER_NAME=Tharun
```

### 6. Test Setup

```bash
# Test all configurations
npm run test-setup

# Send a test SMS
npm run send-test-sms

# Test the full daily workflow
npm run send-daily
```

## Usage

### Local Testing

```bash
# Run once manually
npm run send-daily

# Or run the main script
npm run dev
```

### Deploy to Vercel (Automated Daily Messages)

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Build the project**:
```bash
npm run build
```

3. **Deploy**:
```bash
vercel
```

4. **Set Environment Variables in Vercel**:
   - Go to your project settings on Vercel
   - Add all environment variables from `.env`
   - Add `CRON_SECRET` (generate a random string for security)

5. **Enable Cron Jobs**:
   - Vercel will automatically detect `vercel.json`
   - Cron runs daily at 8:00 AM (configurable in `vercel.json`)

6. **Verify Deployment**:
   - Check Vercel Dashboard > Functions > Cron
   - View logs to confirm execution

### Customize Schedule

Edit `vercel.json` to change the cron schedule:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-motivation",
      "schedule": "0 8 * * *"  // 8 AM daily (UTC)
    }
  ]
}
```

Schedule format: [Cron expression](https://crontab.guru/)
- `0 8 * * *` - 8:00 AM every day
- `0 6 * * 1-5` - 6:00 AM weekdays only
- `0 */6 * * *` - Every 6 hours

## Project Structure

```
whopp-notifications/
├── src/
│   ├── config/           # Configuration and env validation
│   ├── services/         # Core services
│   │   ├── whoop-client.ts    # Whoop API integration
│   │   ├── ai-generator.ts    # Gemini AI message generation
│   │   └── sms-service.ts     # Twilio SMS service
│   ├── types/            # TypeScript type definitions
│   ├── scripts/          # Utility scripts
│   ├── cron/             # Cron job entry points
│   └── index.ts          # Main orchestration
├── api/
│   └── cron/
│       └── daily-motivation.ts  # Vercel cron endpoint
├── .env.example          # Environment template
├── vercel.json           # Vercel configuration
├── package.json
└── tsconfig.json
```

## How It Works

1. **Data Collection**: Fetches latest health data from Whoop API (recovery, sleep, strain, workouts)
2. **AI Analysis**: Sends data to Google Gemini with context about your health metrics
3. **Message Generation**: AI creates personalized, actionable motivational message (<160 chars)
4. **SMS Delivery**: Sends message via Twilio SMS to your phone
5. **Daily Automation**: Runs automatically via Vercel Cron Jobs

## Cost Breakdown

- **Whoop API**: Free
- **Google Gemini**: Free tier (60 requests/min) - more than enough for daily messages
- **Twilio SMS**: ~$0.0075/message = ~$0.23/month for daily messages
- **Vercel Hosting**: Free tier (includes cron jobs)

**Total: < $1/month** (after Twilio trial credits expire)

## Troubleshooting

### "Invalid phone number format"
- Phone numbers must be in E.164 format: `+1234567890`
- Include country code (e.g., +1 for US)

### "Authentication failed" (Whoop)
- Access tokens expire - the app auto-refreshes using refresh token
- If refresh fails, re-do OAuth flow to get new tokens

### "Phone number not verified" (Twilio)
- In trial mode, you must verify recipient numbers
- Upgrade Twilio account to remove this restriction

### Cron not running on Vercel
- Check Vercel Dashboard > Functions > Cron for logs
- Ensure `CRON_SECRET` environment variable is set
- Verify `vercel.json` is in project root

## Interactive Chat Feature

Want to ask questions about your health? You can now text your AI coach!

**Example**: Text "What's my recovery score?" and get an instant AI-powered response.

See [CHAT_SETUP.md](./CHAT_SETUP.md) for detailed setup instructions.

## Future Enhancements

- [ ] Track historical trends in a database
- [ ] Weekly summary reports
- [ ] Personalized workout recommendations
- [ ] Integration with other health apps
- [ ] Web dashboard for viewing history
- [ ] Support for multiple users
- [x] Interactive SMS chat (COMPLETED!)

## Contributing

Pull requests welcome! Please open an issue first to discuss changes.

## License

MIT License - see LICENSE file for details

## Support

For issues with:
- Whoop API: [developer.whoop.com/docs](https://developer.whoop.com/docs)
- Gemini API: [ai.google.dev](https://ai.google.dev)
- Twilio: [twilio.com/docs](https://www.twilio.com/docs)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
