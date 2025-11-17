# Supabase CLI - Quick Reference

## ✅ Setup Complete!

Your Supabase CLI helpers are now installed and ready to use!

### Connection Details
- **Project ID**: `gtdpxovwszdhapszuacs`
- **Database**: `postgres`
- **Host**: `db.gtdpxovwszdhapszuacs.supabase.co`
- **Connection String**: `postgresql://postgres:Tharun%409381@db.gtdpxovwszdhapszuacs.supabase.co:5432/postgres`

### Tables Created
✅ users (User accounts)
✅ user_health_providers (Connected wearables)
✅ health_metrics (Daily health data)
✅ ai_generated_messages (Message history)
✅ notification_logs (Delivery tracking)
✅ health_goals (User health targets)
✅ user_analytics (Analytics & insights)
✅ provider_configurations (Reference data)
✅ error_logs (Error tracking)

---

## Quick Commands

### Connect to Database
```bash
supabase-db
```
Opens an interactive psql session to your Supabase database.

### List All Tables
```bash
supabase-tables
```
Shows all tables in the database.

### Run Custom SQL Query
```bash
supabase-query "SELECT * FROM users LIMIT 5;"
```

### View Recent Users
```bash
supabase-users
```

### View Connected Providers
```bash
supabase-providers
```

### Count Health Metrics
```bash
supabase-metrics-count
```

### View Recent Messages
```bash
supabase-messages
```

### View Analytics
```bash
supabase-analytics
```

---

## Common Queries

### Insert a Test User
```bash
supabase-query "INSERT INTO users (email, password_hash, full_name, timezone, notification_time) VALUES ('test@example.com', '\$2b\$10\$hash', 'Test User', 'America/New_York', '08:00') RETURNING id;"
```

### Get User by Email
```bash
supabase-query "SELECT id, email, full_name FROM users WHERE email = 'test@example.com';"
```

### Count Metrics for a User
```bash
supabase-query "SELECT user_id, COUNT(*) as metric_count FROM health_metrics GROUP BY user_id;"
```

### View Provider Status
```bash
supabase-query "SELECT user_id, provider_name, sync_status, last_synced_at FROM user_health_providers;"
```

### Check Message Delivery Status
```bash
supabase-query "SELECT user_id, date, delivery_status, delivered_at FROM ai_generated_messages WHERE delivery_status != 'pending' LIMIT 10;"
```

### View Analytics Trends
```bash
supabase-query "SELECT user_id, date, recovery_trend, sleep_trend, activity_trend FROM user_analytics ORDER BY date DESC LIMIT 10;"
```

---

## Advanced Usage

### Connect with Specific Port
```bash
supabase-db -p 5432
```

### Run SQL File
```bash
psql postgresql://postgres:Tharun%409381@db.gtdpxovwszdhapszuacs.supabase.co:5432/postgres -f schema.sql
```

### Export Query Results to CSV
```bash
psql postgresql://postgres:Tharun%409381@db.gtdpxovwszdhapszuacs.supabase.co:5432/postgres -c "SELECT * FROM users;" -csv > users.csv
```

### Show Table Schema
```bash
supabase-query "\d users"
```

### Show Table Indexes
```bash
supabase-query "\di idx_*"
```

---

## Environment Info

Your Supabase CLI is configured in: `.supabase-cli`

The configuration has been added to: `~/.zshrc`

This means when you open a new terminal, these commands will be available automatically:
```bash
supabase-db
supabase-tables
supabase-query
supabase-users
supabase-providers
supabase-metrics-count
supabase-messages
supabase-analytics
```

---

## Troubleshooting

### "Command not found: supabase-db"
Try:
```bash
source ~/.zshrc
```

Or reload your terminal.

### "Connection refused"
Verify your internet connection and that Supabase project is active.

### "Role 'postgres' does not exist"
Password is incorrect or you're using wrong connection string.

### "Permission denied"
Check that your IP address is whitelisted (it should be by default).

---

## Use Cases

### 1. Monitor User Growth
```bash
supabase-query "SELECT DATE(created_at) as signup_date, COUNT(*) as new_users FROM users GROUP BY DATE(created_at) ORDER BY signup_date DESC;"
```

### 2. Check Data Completeness
```bash
supabase-query "SELECT user_id, COUNT(*) as metric_count, AVG(data_completeness) as avg_completeness FROM health_metrics GROUP BY user_id;"
```

### 3. Find Users with Issues
```bash
supabase-query "SELECT DISTINCT user_id, provider_name, last_error FROM user_health_providers WHERE last_error IS NOT NULL;"
```

### 4. Message Delivery Report
```bash
supabase-query "SELECT delivery_status, COUNT(*) as count FROM ai_generated_messages GROUP BY delivery_status;"
```

### 5. Health Trend Analysis
```bash
supabase-query "SELECT user_id, recovery_trend, sleep_trend, activity_trend, consecutive_days_tracked FROM user_analytics ORDER BY consecutive_days_tracked DESC LIMIT 10;"
```

---

## Next Steps

Now that you have CLI access:

1. **Insert test data**: Use `supabase-query` to add test users
2. **Monitor metrics**: Check health data as it's inserted
3. **Track analytics**: Monitor user trends and achievements
4. **Debug issues**: Check error logs for any problems
5. **Verify delivery**: Track message delivery status

---

## Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL psql**: https://www.postgresql.org/docs/current/app-psql.html
- **SQL Cheat Sheet**: https://www.postgresql.org/docs/current/sql-commands.html

---

## Security Notes

⚠️ **Important**:
- Your `.supabase-cli` file contains your database password
- Add it to `.gitignore` to prevent accidental commits
- Never share this file or your password
- The password is URL-encoded in the connection string (`%40` = `@`)

```bash
# Add to .gitignore
echo ".supabase-cli" >> .gitignore
```

---

## Quick Tip

Create an alias in your shell for even faster access:
```bash
# In ~/.zshrc
alias sdb='supabase-db'
alias sq='supabase-query'
alias st='supabase-tables'
```

Then you can just type:
```bash
sdb           # Connect to database
sq "SELECT..." # Run query
st            # List tables
```

---

Happy querying! 🚀
