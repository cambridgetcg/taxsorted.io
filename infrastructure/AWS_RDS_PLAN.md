# TaxSorted.io AWS RDS Infrastructure Plan

> **Purpose Prompter Analysis**
> - **LONGING**: Reliable, secure, cost-effective database infrastructure for UK tax compliance platform
> - **TERRITORY**: CHARTED - Existing Aurora Serverless v2 module available
> - **Pattern Source**: `ecosystem/infrastructure/_devops/terraform/modules/rds-aurora/`

---

## Executive Summary

TaxSorted.io will use **Aurora Serverless v2 PostgreSQL** for its database layer, leveraging the existing ecosystem Terraform module. This provides:

- **Cost Efficiency**: Scale to zero capability (0.5 ACU minimum)
- **Auto-scaling**: Handles traffic spikes during tax deadlines
- **Security**: Encryption at rest, VPC isolation, Secrets Manager integration
- **Reliability**: Multi-AZ by default, automated backups

---

## Architecture Decision

### Why Aurora Serverless v2?

| Factor | Decision | Rationale |
|--------|----------|-----------|
| **Workload** | Variable | Tax filing has seasonal peaks (January, April, July, October) |
| **Cost Model** | Pay-per-use | Startup phase - optimize for variable usage |
| **Scaling** | Automatic | No capacity planning required |
| **Availability** | Multi-AZ | Tax compliance requires high availability |

### Alternatives Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Aurora Serverless v2 | Auto-scale, cost-effective | Slightly higher per-ACU cost | ✅ Selected |
| Aurora Provisioned | Predictable pricing | Fixed capacity, overprovisioning | ❌ Rejected |
| RDS PostgreSQL | Simple, familiar | No auto-scaling | ❌ Rejected |
| PlanetScale | Edge, serverless | MySQL only, vendor lock-in | ❌ Rejected |

---

## Capacity Planning

### Initial Configuration

```hcl
min_capacity = 0.5   # Minimum 0.5 ACU (~1 GB RAM)
max_capacity = 4     # Maximum 4 ACU (~8 GB RAM) - startup phase
```

### Scaling Triggers

| Metric | Scale Up | Scale Down |
|--------|----------|------------|
| CPU Utilization | > 70% for 3 min | < 30% for 15 min |
| Memory Pressure | > 90% | < 50% |
| Connections | > 80% of max | < 20% of max |

### Growth Path

| Phase | Timeline | Max ACU | Est. Monthly Cost |
|-------|----------|---------|-------------------|
| MVP | Month 1-3 | 4 | $50-150 |
| Growth | Month 4-12 | 8 | $150-400 |
| Scale | Year 2+ | 16 | $400-1000 |

---

## Security Architecture

### Network Isolation

```
┌─────────────────────────────────────────────────────────────────────┐
│                           VPC (10.0.0.0/16)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Public Subnets (10.0.1.0/24, 10.0.2.0/24)      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │ NAT Gateway │  │ Load Balancer│  │ Bastion Host│         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │             Private Subnets (10.0.10.0/24, 10.0.11.0/24)    │   │
│  │  ┌─────────────┐  ┌─────────────┐                          │   │
│  │  │ App Servers │  │ Lambda Funcs│ ──────────────┐          │   │
│  │  └─────────────┘  └─────────────┘               │          │   │
│  └─────────────────────────────────────────────────│──────────┘   │
│                                                    │               │
│  ┌─────────────────────────────────────────────────│──────────┐   │
│  │            Database Subnets (10.0.20.0/24, 10.0.21.0/24)   │   │
│  │  ┌───────────────────────────────────────────────────────┐ │   │
│  │  │                 Aurora Serverless v2                  │ │   │
│  │  │           (taxsorted-prod-aurora cluster)             │ │   │
│  │  └───────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Security Controls

| Control | Implementation |
|---------|----------------|
| **Encryption at Rest** | AWS KMS (AES-256) |
| **Encryption in Transit** | TLS 1.3 enforced |
| **Network Access** | Security group - port 5432 from app subnets only |
| **Credentials** | AWS Secrets Manager with rotation |
| **IAM** | Database authentication for Lambda functions |
| **Audit** | CloudWatch Logs for all DDL statements |

---

## Connection Strategy

### Vercel Deployment Considerations

Since TaxSorted.io runs on Vercel (serverless), we need to handle connection pooling:

| Option | Implementation | Recommendation |
|--------|----------------|----------------|
| **Direct** | Native PostgreSQL driver | ❌ Not recommended - connection exhaustion |
| **PgBouncer** | Connection pooler sidecar | ⚠️ Requires EC2/ECS |
| **Data API** | Aurora Data API (HTTP) | ✅ Recommended for Vercel |
| **Neon Pooler** | External pooler | ⚠️ Additional cost |

### Recommended: Hybrid Approach

```typescript
// Development & Preview: Aurora Data API (HTTP-based, no connection limit)
// Production: Direct connection with careful pooling via Prisma

// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // Direct for production
  directUrl = env("DIRECT_DATABASE_URL")  // For migrations
}

// Prisma connection settings (schema.prisma)
// connectionLimit = 5  // Conservative for serverless
```

---

## Terraform Configuration

### Module Usage

```hcl
# infrastructure/terraform/main.tf

module "aurora" {
  source = "../../../../ecosystem/infrastructure/_devops/terraform/modules/rds-aurora"

  name                 = "taxsorted-${var.environment}"
  vpc_id               = module.vpc.vpc_id
  db_subnet_group_name = aws_db_subnet_group.database.name

  # Security
  allowed_security_group_ids = [aws_security_group.app.id]
  allowed_cidr_blocks        = []  # No direct CIDR access

  # Capacity
  min_capacity = var.environment == "prod" ? 0.5 : 0.5
  max_capacity = var.environment == "prod" ? 4 : 2

  # Database
  database_name   = "taxsorted"
  master_username = "taxsorted_admin"

  # Availability
  instance_count     = var.environment == "prod" ? 2 : 1
  deletion_protection = var.environment == "prod"

  # Backups
  backup_retention_period      = var.environment == "prod" ? 7 : 1
  skip_final_snapshot          = var.environment != "prod"

  # Monitoring
  performance_insights_enabled   = true
  enhanced_monitoring_interval   = 60

  tags = local.common_tags
}
```

### Required Variables

```hcl
# infrastructure/terraform/variables.tf

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-2"  # London region for UK tax compliance
}
```

### Outputs

```hcl
# infrastructure/terraform/outputs.tf

output "aurora_cluster_endpoint" {
  description = "Aurora cluster writer endpoint"
  value       = module.aurora.cluster_endpoint
}

output "aurora_reader_endpoint" {
  description = "Aurora cluster reader endpoint"
  value       = module.aurora.cluster_reader_endpoint
}

output "aurora_secret_arn" {
  description = "Secrets Manager secret ARN"
  value       = module.aurora.secret_arn
}

output "database_url" {
  description = "Database connection string (without password)"
  value       = module.aurora.connection_string
  sensitive   = true
}
```

---

## Environment Configuration

### Development

| Setting | Value |
|---------|-------|
| Region | eu-west-2 |
| Min ACU | 0.5 |
| Max ACU | 2 |
| Instances | 1 |
| Backups | 1 day |
| Deletion Protection | No |

### Production

| Setting | Value |
|---------|-------|
| Region | eu-west-2 |
| Min ACU | 0.5 |
| Max ACU | 4 (expand to 16 as needed) |
| Instances | 2 (Multi-AZ) |
| Backups | 7 days |
| Deletion Protection | Yes |

---

## Cost Estimation

### Aurora Serverless v2 Pricing (eu-west-2)

| Component | Rate |
|-----------|------|
| ACU-hour | $0.12 per ACU-hour |
| Storage | $0.10 per GB-month |
| I/O | $0.20 per million requests |
| Backups | $0.021 per GB-month (beyond free tier) |

### Monthly Estimates

| Scenario | ACU Hours | Storage | Estimated Cost |
|----------|-----------|---------|----------------|
| Minimal (dev) | 0.5 ACU × 720h = 360 | 10 GB | $44 + $1 = **$45** |
| Light (early prod) | 1 ACU × 720h = 720 | 20 GB | $86 + $2 = **$88** |
| Moderate (growth) | 2 ACU × 720h = 1440 | 50 GB | $173 + $5 = **$178** |
| Peak (tax season) | 4 ACU × 720h = 2880 | 100 GB | $346 + $10 = **$356** |

---

## Implementation Steps

### Phase 1: VPC Setup (If needed)

1. Create VPC with public/private/database subnets
2. Configure NAT Gateway for outbound internet
3. Create DB subnet group

### Phase 2: Aurora Deployment

1. Deploy Aurora module with Terraform
2. Retrieve credentials from Secrets Manager
3. Configure Prisma connection string

### Phase 3: Application Integration

1. Set `DATABASE_URL` in Vercel environment
2. Run Prisma migrations
3. Test connectivity

### Phase 4: Monitoring Setup

1. Configure CloudWatch alarms for:
   - CPU utilization > 80%
   - Freeable memory < 256 MB
   - Connection count > 80% of max
2. Set up SNS notifications

---

## Monitoring & Alerts

### CloudWatch Metrics to Monitor

| Metric | Warning | Critical |
|--------|---------|----------|
| CPUUtilization | > 70% | > 90% |
| ServerlessDatabaseCapacity | > 75% max | > 90% max |
| DatabaseConnections | > 80 | > 95% of max |
| FreeableMemory | < 512 MB | < 256 MB |
| ReadLatency | > 20ms | > 50ms |
| WriteLatency | > 20ms | > 50ms |

### Recommended Alarms

```hcl
resource "aws_cloudwatch_metric_alarm" "aurora_cpu" {
  alarm_name          = "taxsorted-aurora-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Aurora CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBClusterIdentifier = module.aurora.cluster_id
  }
}
```

---

## Disaster Recovery

### Backup Strategy

| Type | Frequency | Retention |
|------|-----------|-----------|
| Automated Snapshots | Daily | 7 days (prod) |
| Manual Snapshots | Before major changes | 30 days |
| Point-in-Time Recovery | Continuous | 7 days |

### Recovery Procedures

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| Instance failure | < 1 min | 0 | Automatic failover to standby |
| AZ failure | < 2 min | 0 | Automatic failover |
| Region failure | < 1 hour | < 5 min | Restore from snapshot in secondary region |
| Data corruption | < 30 min | Variable | Point-in-time recovery |

---

## Next Steps

1. **Create VPC** (if not exists) - Isolated network for TaxSorted.io
2. **Deploy Terraform** - Apply Aurora module configuration
3. **Configure Prisma** - Set up database schema and migrations
4. **Set Environment Variables** - Configure Vercel with database URL
5. **Implement Monitoring** - CloudWatch dashboards and alarms

---

## References

- [Aurora Serverless v2 Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)
- [Ecosystem Aurora Module](../../../ecosystem/infrastructure/_devops/terraform/modules/rds-aurora/)
- [Prisma with Aurora](https://www.prisma.io/docs/guides/database/aurora-serverless)
