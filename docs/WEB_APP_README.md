# Whoop AI Motivator - Web Application

A modern React web application for managing health tracking and wearable device connections.

---

## Features

✅ **User Authentication**
- Sign up and create a new account
- Login with email and password
- Persistent session management
- Secure token storage

✅ **Wearable Device Management**
- Browse available health trackers (Whoop, Fitbit, Garmin, Apple, Samsung, Oura)
- Connect multiple wearable devices
- Manage connected devices
- Set primary device for data collection

✅ **Health Dashboard**
- View today's health metrics (recovery, sleep, strain, HR, HRV)
- 7-day summary statistics
- Health insights and recommendations
- Message delivery tracking
- Connected device overview

✅ **Responsive Design**
- Mobile-friendly interface
- Desktop optimized layout
- Dark theme for comfortable viewing
- Smooth animations and transitions

---

## Project Structure

```
web/
├── public/                  # Static assets
├── src/
│   ├── components/         # Reusable React components
│   │   └── ProviderCard.tsx
│   ├── pages/              # Page components
│   │   ├── Login.tsx       # Login page
│   │   ├── Signup.tsx      # Signup page
│   │   ├── Onboarding.tsx  # Wearable selection
│   │   └── Dashboard.tsx   # Dashboard
│   ├── store/              # Zustand state management
│   │   ├── authStore.ts    # Authentication state
│   │   └── providerStore.ts # Provider management state
│   ├── styles/             # CSS stylesheets
│   │   ├── auth.css        # Auth page styles
│   │   ├── onboarding.css  # Onboarding styles
│   │   ├── provider-card.css
│   │   └── dashboard.css   # Dashboard styles
│   ├── App.tsx             # Main app component with routing
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── .env.example            # Environment variables template
├── index.html              # HTML template
└── vite.config.ts          # Vite configuration
```

---

## Setup & Installation

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation Steps

1. **Install Dependencies**
   ```bash
   cd whopp-notifications
   npm install
   ```

2. **Create Environment File**
   ```bash
   cd web
   cp .env.example .env.local
   ```

3. **Update API URL (optional)**
   Edit `web/.env.local`:
   ```env
   VITE_API_URL=https://your-api-url.com/api/routes
   ```

4. **Start Development Server**
   ```bash
   npm run web:dev
   ```

   The app will be available at `http://localhost:5173`

---

## Running the App

### Development
```bash
npm run web:dev
```

### Build for Production
```bash
npm run web:build
```

### Preview Production Build
```bash
npm run web:preview
```

---

## Authentication Flow

### Signup
1. User fills out signup form (name, email, password, timezone)
2. Account created on backend
3. JWT token received and stored
4. User redirected to onboarding

### Login
1. User enters email and password
2. Credentials validated on backend
3. JWT token received
4. User profile fetched
5. User redirected to onboarding

### Token Management
- Tokens stored in localStorage
- Automatic validation on app start
- Automatic logout on token expiration
- Token included in all API requests

---

## State Management (Zustand)

### Auth Store
```typescript
// Login
await useAuthStore.getState().login(email, password);

// Signup
await useAuthStore.getState().signup(email, password, fullName);

// Logout
useAuthStore.getState().logout();

// Get User
const user = useAuthStore.getState().user;
const token = useAuthStore.getState().token;
```

### Provider Store
```typescript
// Fetch available providers
await useProviderStore.getState().fetchAvailableProviders();

// Fetch connected providers
await useProviderStore.getState().fetchConnectedProviders(token);

// Connect provider
await useProviderStore.getState().connectProvider(
  token,
  'whoop',
  accessToken
);

// Check if connected
const isConnected = useProviderStore.getState().isProviderConnected('whoop');
```

---

## Page Components

### Login Page (`pages/Login.tsx`)
- Email and password input
- Form validation
- Error handling
- Link to signup
- Loading state

### Signup Page (`pages/Signup.tsx`)
- Full name, email, password input
- Timezone and notification time selection
- Password confirmation
- Form validation
- Terms agreement
- Link to login

### Onboarding Page (`pages/Onboarding.tsx`)
- Provider selection with cards
- Provider authentication flow
- Token input (manual for MVP)
- Connected provider confirmation
- Skip option
- Dashboard navigation

### Dashboard Page (`pages/Dashboard.tsx`)
- Today's metrics display
- 7-day summary
- Connected devices list
- Message delivery stats
- Health insights
- Recent messages
- Responsive grid layouts

---

## Styling

### Design System
- **Color Scheme**: Dark blue/slate with accent colors
- **Primary Color**: #3b82f6 (blue)
- **Secondary Color**: #8b5cf6 (purple)
- **Success Color**: #10b981 (green)
- **Danger Color**: #ef4444 (red)

### CSS Files
1. **index.css** - Global styles, utilities, typography
2. **auth.css** - Login/Signup page styles
3. **onboarding.css** - Onboarding and provider auth
4. **provider-card.css** - Provider card component
5. **dashboard.css** - Dashboard and data display

### Responsive Breakpoints
- Desktop: 1200px+
- Tablet: 768px - 1199px
- Mobile: < 768px

---

## API Integration

### Base URL
```
https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes
```

### Endpoints Used

**Authentication**
- `POST /auth?action=signup` - Create account
- `POST /auth?action=login` - Get JWT token
- `GET /auth?action=me` - Get user profile
- `POST /auth?action=validate-token` - Verify token

**Providers**
- `GET /providers?action=available` - List available providers
- `GET /providers?action=list` - List connected providers
- `POST /providers?action=connect` - Connect provider
- `POST /providers?action=set-primary` - Set primary provider
- `DELETE /providers?action=disconnect` - Disconnect provider

**Dashboard**
- `GET /dashboard` - Get dashboard data

---

## Features Implementation Details

### Provider Connection
1. User selects provider from available list
2. Shows provider-specific auth instructions
3. User pastes access token from provider
4. Token validated and stored in Supabase
5. Provider marked as connected

### Future OAuth Integration
Currently tokens are entered manually. For production:
1. Implement OAuth redirect flow
2. Provider redirects back with auth code
3. Exchange code for access token
4. Automatic token refresh handling

---

## Error Handling

### Network Errors
- Automatic retry on failed requests
- User-friendly error messages
- Error state display with retry button

### Authentication Errors
- Invalid credentials show specific error
- Expired tokens trigger logout
- Missing token redirects to login

### Form Validation
- Required field checking
- Email format validation
- Password strength requirements
- Password confirmation matching

---

## Performance Optimizations

1. **Code Splitting** - Route-based lazy loading
2. **Memoization** - Prevent unnecessary re-renders
3. **Caching** - Zustand state persistence
4. **Lazy Loading** - Images and components load on demand
5. **CSS** - Minified and optimized in production

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect Vercel to GitHub
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms
```bash
# Build
npm run web:build

# Output in dist/web/
# Deploy dist/web/ folder
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | https://api.example.com/api/routes |

---

## Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/feature-name
   ```

2. **Start Dev Server**
   ```bash
   npm run web:dev
   ```

3. **Make Changes**
   - Edit components in `src/`
   - HMR automatically reloads

4. **Test**
   - Manual testing in browser
   - Check console for errors

5. **Build & Test**
   ```bash
   npm run web:build
   npm run web:preview
   ```

6. **Commit & Push**
   ```bash
   git add .
   git commit -m "feature: description"
   git push origin feature/feature-name
   ```

---

## Troubleshooting

### Port Already in Use
```bash
# Use different port
npm run web:dev -- --port 3001
```

### API Connection Failed
1. Check `VITE_API_URL` in `.env.local`
2. Verify backend is running
3. Check CORS headers
4. Review network tab in DevTools

### Token Expired
- Automatic logout will redirect to login
- User needs to login again

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run web:build
```

---

## Future Enhancements

1. **Charts & Visualizations**
   - Daily metrics charts
   - Trend graphs
   - Health goal progress

2. **More Providers**
   - OAuth implementation for Whoop, Fitbit
   - Apple Health integration
   - Samsung Health integration

3. **Advanced Features**
   - Health goal setting
   - Message customization
   - Notification preferences
   - Social features

4. **Mobile App**
   - React Native implementation
   - Push notifications
   - Native health integrations

---

## Support & Contributing

For issues, questions, or contributions:
1. Check existing issues on GitHub
2. Create detailed issue with reproduction steps
3. Submit pull requests with improvements

---

## License

MIT License - See LICENSE file for details

---

## Quick Reference

### Component Structure
```typescript
// Page component structure
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function MyPage() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!token) navigate('/login');
  }, [token]);

  return (
    <div className="page-container">
      {/* Content */}
    </div>
  );
}
```

### Adding a New Page
1. Create file in `src/pages/MyPage.tsx`
2. Add route in `App.tsx`
3. Add navigation link if needed
4. Create styles in `src/styles/my-page.css`

### Adding a New Component
1. Create file in `src/components/MyComponent.tsx`
2. Define props interface
3. Export component
4. Use in pages

---

## Contact

For more information, see the main [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
