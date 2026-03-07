# TaxSorted.io Terraform Infrastructure

This directory contains Terraform configuration for TaxSorted.io AWS infrastructure.

## Architecture

- **Aurora Serverless v2 PostgreSQL** - Auto-scaling database
- **VPC** - Isolated network with public/private/database subnets
- **CloudWatch Alarms** - Monitoring and alerting (production only)

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.5.0
3. Access to the ecosystem Aurora module

## Usage

### Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

### Deploy Development Environment

```bash
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

### Deploy Production Environment

```bash
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

## Retrieving Database Credentials

After deployment, retrieve the database credentials from AWS Secrets Manager:

```bash
# Get the secret ARN from Terraform output
terraform output aurora_secret_arn

# Retrieve the secret value
aws secretsmanager get-secret-value \
  --secret-id $(terraform output -raw aurora_secret_name) \
  --query SecretString \
  --output text | jq .
```

## Environment Variables for Vercel

Set these environment variables in Vercel:

```bash
# From Secrets Manager
DATABASE_URL=postgresql://user:password@endpoint:5432/taxsorted

# Optional: Direct URL for migrations
DIRECT_DATABASE_URL=postgresql://user:password@endpoint:5432/taxsorted
```

## Cost Estimates

| Environment | Monthly Estimate |
|-------------|------------------|
| Development | $45-60 |
| Production | $100-200 (scales with usage) |

## File Structure

```
terraform/
├── main.tf              # Main infrastructure configuration
├── variables.tf         # Variable definitions
├── outputs.tf           # Output definitions
├── environments/
│   ├── dev.tfvars       # Development settings
│   └── prod.tfvars      # Production settings
└── README.md            # This file
```

## Module Dependencies

This configuration uses:
- AWS VPC Module (terraform-aws-modules/vpc/aws)
- Ecosystem Aurora Module (../../../../ecosystem/infrastructure/_devops/terraform/modules/rds-aurora)

## Monitoring

Production environment includes CloudWatch alarms for:
- CPU utilization > 80%
- Database connections > 80

Alarms are sent to the SNS topic: `taxsorted-prod-alerts`

## Security Notes

1. Database is only accessible from within the VPC
2. Credentials are stored in AWS Secrets Manager
3. All data is encrypted at rest using AWS KMS
4. TLS is enforced for all connections
