resource "kubernetes_namespace" "finlab" {
  metadata {
    name = var.namespace
  }
}

resource "helm_release" "finlab" {
  name      = var.release_name
  namespace = kubernetes_namespace.finlab.metadata[0].name
  chart     = var.chart_path

  create_namespace = false

  values = [
    file("${var.chart_path}/values.yaml")
  ]

  set {
    name  = "registry"
    value = var.image_registry
  }

  set {
    name  = "backend.image"
    value = var.backend_image
  }

  set {
    name  = "backend.tag"
    value = var.image_tag
  }

  set {
    name  = "frontend.image"
    value = var.frontend_image
  }

  set {
    name  = "frontend.tag"
    value = var.image_tag
  }

  set {
    name  = "usersService.image"
    value = var.users_image
  }

  set {
    name  = "usersService.tag"
    value = var.image_tag
  }

  set {
    name  = "ordersService.image"
    value = var.orders_image
  }

  set {
    name  = "ordersService.tag"
    value = var.image_tag
  }

  set {
    name  = "paymentsService.image"
    value = var.payments_image
  }

  set {
    name  = "paymentsService.tag"
    value = var.image_tag
  }

  depends_on = [
    kubernetes_namespace.finlab
  ]
}