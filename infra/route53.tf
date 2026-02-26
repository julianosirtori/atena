################################################################################
# Route53 Hosted Zone (conditional)
################################################################################

resource "aws_route53_zone" "main" {
  count = var.create_hosted_zone ? 1 : 0

  name = var.domain_name

  tags = { Name = "${local.name_prefix}-zone" }
}

################################################################################
# DNS Record — API (conditional)
################################################################################

data "aws_route53_zone" "existing" {
  count = local.has_domain && !var.create_hosted_zone ? 1 : 0

  name         = var.domain_name
  private_zone = false
}

locals {
  zone_id = local.has_domain ? (
    var.create_hosted_zone
    ? aws_route53_zone.main[0].zone_id
    : data.aws_route53_zone.existing[0].zone_id
  ) : null
}

resource "aws_route53_record" "api" {
  count = local.has_domain ? 1 : 0

  zone_id = local.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

################################################################################
# ACM Certificate DNS Validation Records
################################################################################

resource "aws_route53_record" "cert_validation" {
  for_each = local.has_domain ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = local.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]

  allow_overwrite = true
}
