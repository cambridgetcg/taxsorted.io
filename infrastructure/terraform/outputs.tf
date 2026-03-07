# TaxSorted.io Terraform Outputs

#------------------------------------------------------------------------------
# VPC Outputs
#------------------------------------------------------------------------------

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = module.vpc.database_subnets
}

output "database_subnet_group_name" {
  description = "Database subnet group name"
  value       = module.vpc.database_subnet_group_name
}

#------------------------------------------------------------------------------
# Aurora Database Outputs
#------------------------------------------------------------------------------

output "aurora_cluster_id" {
  description = "Aurora cluster identifier"
  value       = module.aurora.cluster_id
}

output "aurora_cluster_arn" {
  description = "Aurora cluster ARN"
  value       = module.aurora.cluster_arn
}

output "aurora_cluster_endpoint" {
  description = "Aurora cluster writer endpoint for read/write operations"
  value       = module.aurora.cluster_endpoint
}

output "aurora_reader_endpoint" {
  description = "Aurora cluster reader endpoint for read-only operations"
  value       = module.aurora.cluster_reader_endpoint
}

output "aurora_port" {
  description = "Aurora cluster port"
  value       = module.aurora.cluster_port
}

output "aurora_database_name" {
  description = "Name of the default database"
  value       = module.aurora.database_name
}

output "aurora_master_username" {
  description = "Master username for database"
  value       = module.aurora.master_username
}

output "aurora_secret_arn" {
  description = "ARN of the Secrets Manager secret containing database credentials"
  value       = module.aurora.secret_arn
}

output "aurora_secret_name" {
  description = "Name of the Secrets Manager secret"
  value       = module.aurora.secret_name
}

output "aurora_security_group_id" {
  description = "Security group ID for Aurora cluster"
  value       = module.aurora.security_group_id
}

#------------------------------------------------------------------------------
# Application Integration
#------------------------------------------------------------------------------

output "database_url" {
  description = "PostgreSQL connection string (without password - retrieve from Secrets Manager)"
  value       = module.aurora.connection_string
  sensitive   = true
}

output "app_security_group_id" {
  description = "Security group ID for application servers (grants database access)"
  value       = aws_security_group.app.id
}

#------------------------------------------------------------------------------
# Monitoring
#------------------------------------------------------------------------------

output "alerts_sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alerts"
  value       = aws_sns_topic.alerts.arn
}
