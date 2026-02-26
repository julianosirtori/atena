variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "sa-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "atena"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "api_cpu" {
  description = "CPU units for API task (1024 = 1 vCPU)"
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "Memory (MB) for API task"
  type        = number
  default     = 512
}

variable "workers_cpu" {
  description = "CPU units for Workers task"
  type        = number
  default     = 256
}

variable "workers_memory" {
  description = "Memory (MB) for Workers task"
  type        = number
  default     = 512
}

variable "api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 1
}

variable "workers_desired_count" {
  description = "Desired number of Workers tasks"
  type        = number
  default     = 1
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_backup_retention" {
  description = "RDS backup retention in days"
  type        = number
  default     = 7
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "domain_name" {
  description = "Domain name for the application (leave empty to use ALB DNS)"
  type        = string
  default     = ""
}

variable "create_hosted_zone" {
  description = "Whether to create a Route53 hosted zone"
  type        = bool
  default     = false
}

variable "github_repo" {
  description = "GitHub repository for OIDC (owner/repo)"
  type        = string
  default     = "julianosirtori/atena"
}
