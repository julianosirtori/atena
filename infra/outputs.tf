################################################################################
# Outputs
################################################################################

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "ecr_api_url" {
  description = "ECR repository URL for API"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_workers_url" {
  description = "ECR repository URL for Workers"
  value       = aws_ecr_repository.workers.repository_url
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "api_service_name" {
  description = "ECS API service name"
  value       = aws_ecs_service.api.name
}

output "workers_service_name" {
  description = "ECS Workers service name"
  value       = aws_ecs_service.workers.name
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC"
  value       = aws_iam_role.github_actions.arn
}

output "ecs_security_group_id" {
  description = "ECS security group ID (needed for CI/CD RunTask)"
  value       = aws_security_group.ecs.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs (needed for CI/CD RunTask)"
  value       = aws_subnet.private[*].id
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}
