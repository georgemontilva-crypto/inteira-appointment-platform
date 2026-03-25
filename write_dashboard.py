#!/usr/bin/env python3
"""Rewrite UserDashboard with 2-column desktop layout."""

# Read current file to get the top portion (imports + helpers + state/queries/mutations)
with open('/home/ubuntu/inteira-appointment-platform/client/src/pages/UserDashboard.tsx', 'r') as f:
    old = f.read()

# The render section starts at "  return (" after the handleSubmitReview function
# We'll keep everything up to the return and replace the JSX

# Find the start of the return statement
return_idx = old.rfind('\n  return (')
top_part = old[:return_idx]

# New JSX render
new_jsx = r"""
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5 w-full">

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl gradient-hero text-white p-5 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-10" style={{ background: "white", transform: "translate(30%,-30%)" }} />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white/70 text-sm">Bienvenido de vuelta</p>
              <h1 className="text-2xl font-bold mt-0.5" style={{ fontFamily: "Poppins, sans-serif" }}>
                Hola, {user?.name?.split(" ")[0] ?? "Usuario"} 👋
              </h1>
            </div>
            <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 h-9" onClick={() => navigate("/especialidades")}>
              <Plus className="w-4 h-4 mr-1.5" /> Nueva cita
            </Button>
          </div>
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            <button onClick={() => navigate("/citas")} className="bg-white/10 hover:bg-white/20 transition-colors rounded-xl p-3 text-left">
              <p className="text-xl font-bold">{upcomingAppointments.length}</p>
              <p className="text-white/60 text-xs mt-0.5">Próximas</p>
            </button>
            <button onClick={() => navigate("/citas")} className="bg-white/10 hover:bg-white/20 transition-colors rounded-xl p-3 text-left">
              <p className="text-xl font-bold">{completedCount}</p>
              <p className="text-white/60 text-xs mt-0.5">Completadas</p>
            </button>
            <button onClick={() => navigate("/wallet")} className="bg-white/10 hover:bg-white/20 transition-colors rounded-xl p-3 text-left">
              <p className="text-xl font-bold">{creditBalance.toLocaleString("es-MX")}</p>
              <p className="text-white/60 text-xs mt-0.5">Créditos</p>
            </button>
            <button onClick={() => navigate("/suscripcion")} className="bg-white/10 hover:bg-white/20 transition-colors rounded-xl p-3 text-left">
              <p className="text-sm font-bold truncate leading-tight">{(subscription as any)?.planName ?? "Sin plan"}</p>
              <p className="text-white/60 text-xs mt-0.5">Plan activo</p>
            </button>
          </div>
        </div>

        {/* ── ALERTA CRÉDITOS ──────────────────────────────────────────── */}
        {creditsExpiringSoon && nextExpiry && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">Créditos por vencer</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Tienes {creditBalance.toLocaleString("es-MX")} créditos que vencen{" "}
                {formatDistanceToNow(nextExpiry, { addSuffix: true, locale: es })}.
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 flex-shrink-0" onClick={() => navigate("/especialidades")}>
              Usar ahora
            </Button>
          </div>
        )}

        {/* ── NOTIFICACIONES ───────────────────────────────────────────── */}
        {unreadNotifications.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Notificaciones
                  <Badge className="bg-primary text-white border-0 text-[10px] px-1.5 py-0.5">{unreadNotifications.length}</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
                  onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
                  {markAllReadMutation.isPending
                    ? <span className="animate-spin w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full" />
                    : "Marcar leídas"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {unreadNotifications.slice(0, 3).map((n: any) => (
                <div key={n.id} className="flex items-start gap-3 p-2.5 bg-primary/5 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                    {n.link && (
                      <button onClick={() => navigate(n.link)} className="text-[11px] text-primary font-medium mt-1 hover:underline">
                        Ver más →
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── GRID 2 COLUMNAS ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* COLUMNA PRINCIPAL (2/3) */}
          <div className="lg:col-span-2 space-y-5">

            {/* Próxima cita destacada */}
            {nextAppointment && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Tu próxima sesión</h2>
                  <Button variant="ghost" size="sm" className="text-primary text-xs h-7" onClick={() => navigate("/citas")}>
                    Ver todas <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </div>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {((nextAppointment as any).professionalName ?? "P").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">
                          {(nextAppointment as any).professionalName ?? `Especialista #${nextAppointment.professionalId}`}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-primary font-semibold capitalize">
                            <Calendar className="w-3 h-3" />
                            {getDateLabel(new Date(nextAppointment.appointmentDate))}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(nextAppointment.appointmentDate), "HH:mm", { locale: es })}
                            {nextAppointment.durationMinutes ? ` · ${nextAppointment.durationMinutes} min` : ""}
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] flex-shrink-0">Confirmada</Badge>
                    </div>
                    <div className="flex gap-2">
                      {nextAppointment.videoCallLink ? (
                        <a href={nextAppointment.videoCallLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button size="sm" className="w-full gradient-brand text-white border-0 h-9 text-xs font-semibold">
                            <Video className="w-3.5 h-3.5 mr-1.5" /> Unirse a la sesión
                          </Button>
                        </a>
                      ) : (
                        <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                          <Video className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">El enlace estará disponible próximamente</span>
                        </div>
                      )}
                      <Button size="sm" variant="outline" className="h-9 text-xs border-red-200 text-red-500 hover:bg-red-50 flex-shrink-0 px-3"
                        disabled={cancelingId === nextAppointment.id} onClick={() => handleCancel(nextAppointment.id)}>
                        {cancelingId === nextAppointment.id
                          ? <span className="animate-spin w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full" />
                          : <><X className="w-3 h-3 mr-1" />Cancelar</>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Próximas citas lista */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Próximas citas
                  {upcomingAppointments.length > 0 && (
                    <Badge className="ml-2 bg-primary/10 text-primary border-0 text-[10px]">{upcomingAppointments.length}</Badge>
                  )}
                </h2>
                <Button variant="ghost" size="sm" className="text-primary text-xs h-7" onClick={() => navigate("/citas")}>
                  Ver todas <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
              {loadingAppointments ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Card key={i} className="border-border animate-pulse"><CardContent className="p-4 h-16" /></Card>)}
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <Card className="border-border border-dashed">
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="font-semibold text-muted-foreground text-sm">No tienes citas próximas</p>
                    <p className="text-xs text-muted-foreground mt-1">Agenda una consulta con un especialista</p>
                    <Button className="mt-4 gradient-brand text-white border-0" size="sm" onClick={() => navigate("/especialidades")}>
                      <Plus className="w-4 h-4 mr-2" /> Agendar ahora
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {upcomingAppointments.slice(0, 4).map((apt) => (
                    <Card key={apt.id} className="border-border hover:border-primary/30 hover:shadow-sm transition-all">
                      <CardContent className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold flex-shrink-0">
                            {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1 text-xs text-primary font-medium capitalize">
                                <Calendar className="w-3 h-3" /> {getDateLabel(new Date(apt.appointmentDate))}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" /> {format(new Date(apt.appointmentDate), "HH:mm", { locale: es })}
                                {apt.durationMinutes ? ` · ${apt.durationMinutes} min` : ""}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">Confirmada</Badge>
                            {apt.videoCallLink && (
                              <a href={apt.videoCallLink} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" className="gradient-brand text-white border-0 h-7 text-xs px-2">
                                  <Video className="w-3 h-3 mr-1" />Unirse
                                </Button>
                              </a>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              disabled={cancelingId === apt.id} onClick={() => handleCancel(apt.id)} title="Cancelar cita">
                              {cancelingId === apt.id
                                ? <span className="animate-spin w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full" />
                                : <X className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Historial */}
            {pastAppointments.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Historial de sesiones</h2>
                  <Button variant="ghost" size="sm" className="text-primary text-xs h-7" onClick={() => navigate("/citas")}>
                    Ver todo <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {visibleHistory.map((apt) => (
                    <Card key={apt.id} className="border-border">
                      <CardContent className="p-3.5">
                        {ratingId === apt.id ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold">Califica tu sesión con {(apt as any).professionalName ?? "el especialista"}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(apt.appointmentDate), "d 'de' MMMM", { locale: es })}</p>
                              </div>
                            </div>
                            <StarRating value={rating} onChange={setRating} />
                            <textarea value={ratingComment} onChange={(e) => setRatingComment(e.target.value)}
                              placeholder="Comparte tu experiencia (opcional)..." rows={2}
                              className="w-full text-sm border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background" />
                            <div className="flex gap-2">
                              <Button size="sm" className="gradient-brand text-white border-0 text-xs flex-1"
                                disabled={reviewMutation.isPending} onClick={() => handleSubmitReview(apt)}>
                                {reviewMutation.isPending
                                  ? <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1.5" />
                                  : <ThumbsUp className="w-3 h-3 mr-1.5" />}
                                Enviar reseña
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs"
                                onClick={() => { setRatingId(null); setRating(5); setRatingComment(""); }}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm flex-shrink-0">
                              {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}
                              </p>
                              <p className="text-xs text-muted-foreground">{format(new Date(apt.appointmentDate), "d MMM yyyy", { locale: es })}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Badge className={`${statusColors[apt.status]} border-0 text-[10px]`}>{statusLabels[apt.status]}</Badge>
                              {apt.status === "completed" && !(apt as any).hasReview && (
                                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                                  onClick={() => setRatingId(apt.id)}>
                                  <Star className="w-3 h-3 mr-1" /> Calificar
                                </Button>
                              )}
                              {apt.status === "completed" && (apt as any).hasReview && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Calificada
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {pastAppointments.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-primary text-xs"
                    onClick={() => setShowAllHistory(!showAllHistory)}>
                    {showAllHistory ? "Ver menos" : `Ver ${pastAppointments.length - 3} más`}
                    <ChevronRight className={`w-3.5 h-3.5 ml-1 transition-transform ${showAllHistory ? "rotate-90" : ""}`} />
                  </Button>
                )}
              </div>
            )}

            {/* Profesionales destacados */}
            {featuredProfessionals && featuredProfessionals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Profesionales destacados</h2>
                  <Button variant="ghost" size="sm" className="text-primary text-xs h-7" onClick={() => navigate("/especialidades")}>
                    Ver todos <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {featuredProfessionals.map((pro) => (
                    <button key={pro.id} onClick={() => navigate(`/profesional/${pro.id}`)}
                      className="bg-white rounded-2xl p-3.5 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left">
                      <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold mb-2.5">
                        {((pro as any).name ?? "P").charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs font-semibold truncate">{(pro as any).name ?? "Profesional"}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{(pro as any).specialtyName ?? "Especialista"}</p>
                      {pro.averageRating && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-[10px] font-medium">{Number(pro.averageRating).toFixed(1)}</span>
                          <span className="text-[10px] text-muted-foreground">({pro.totalReviews})</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* COLUMNA LATERAL (1/3) */}
          <div className="space-y-5">

            {/* Wallet */}
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mi wallet</p>
                      <p className="text-xl font-bold text-primary leading-tight">
                        {creditBalance.toLocaleString("es-MX")}
                        <span className="text-xs font-normal text-muted-foreground ml-1">créditos</span>
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-primary/30 text-primary" onClick={() => navigate("/wallet")}>
                    Ver <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                {nextExpiry && creditBalance > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-3">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Vence: <span className="font-medium text-foreground">{format(nextExpiry, "d 'de' MMMM", { locale: es })}</span></span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" className="gradient-brand text-white border-0 h-8 text-xs" onClick={() => navigate("/planes")}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Comprar
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-primary/30 text-primary" onClick={() => navigate("/especialidades")}>
                    <Calendar className="w-3.5 h-3.5 mr-1" /> Agendar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Accesos rápidos */}
            <div>
              <h2 className="text-base font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>Accesos rápidos</h2>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => navigate("/perfil")}
                  className="flex items-center gap-2.5 bg-white rounded-2xl p-3 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">Mi perfil</p>
                    <p className="text-[10px] text-muted-foreground">Editar</p>
                  </div>
                </button>
                <button onClick={() => navigate("/citas")}
                  className="flex items-center gap-2.5 bg-white rounded-2xl p-3 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">Mis citas</p>
                    <p className="text-[10px] text-muted-foreground">Historial</p>
                  </div>
                </button>
                <button onClick={() => navigate("/wallet")}
                  className="flex items-center gap-2.5 bg-white rounded-2xl p-3 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">Wallet</p>
                    <p className="text-[10px] text-muted-foreground truncate">{creditBalance} créditos</p>
                  </div>
                </button>
                <button onClick={() => navigate("/suscripcion")}
                  className="flex items-center gap-2.5 bg-white rounded-2xl p-3 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left">
                  <div className="w-8 h-8 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">Suscripción</p>
                    <p className="text-[10px] text-muted-foreground truncate">{(subscription as any)?.planName ?? "Sin plan"}</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Especialidades */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Especialidades</h2>
                <Button variant="ghost" size="sm" className="text-primary text-xs h-7" onClick={() => navigate("/especialidades")}>
                  Ver todas <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(specialties ?? [
                  { id: 1, name: "Psicología" }, { id: 2, name: "Emprendimiento" },
                  { id: 3, name: "Finanzas" }, { id: 4, name: "Legal" },
                  { id: 5, name: "Coaching de vida" }, { id: 6, name: "Nutrición" },
                ]).slice(0, 6).map((s) => (
                  <button key={s.id} onClick={() => navigate(`/especialidades/${s.id}`)}
                    className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left">
                    <div className={`w-7 h-7 rounded-lg ${specialtyBg[s.name] ?? "bg-[#607562]"} flex items-center justify-center flex-shrink-0`}>
                      {specialtyIcon[s.name] ?? <Compass className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Promo */}
            <div className="rounded-2xl gradient-hero text-white p-4 flex flex-col gap-3">
              <div>
                <p className="text-sm font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Mejora tu experiencia</p>
                <p className="text-white/70 text-xs mt-1">Accede a más sesiones y beneficios exclusivos con un plan premium.</p>
              </div>
              <Button onClick={() => navigate("/planes")} className="bg-white text-primary hover:bg-white/90 border-0 w-full text-xs h-8 font-semibold" size="sm">
                Ver planes <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>

          </div>
        </div>

        <div className="h-6 md:h-0" />
      </div>
    </DashboardLayout>
  );
}
"""

with open('/home/ubuntu/inteira-appointment-platform/client/src/pages/UserDashboard.tsx', 'w') as f:
    f.write(top_part + new_jsx)

print(f"Done. New file has {len((top_part + new_jsx).split(chr(10)))} lines")
