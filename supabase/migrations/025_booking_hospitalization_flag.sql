-- Convention CPAM 2025 : flag hospitalisation pour facturation retour à vide (art. 4)
-- Retour à vide éligible : hospitalisation complète/partielle/ambulatoire,
-- dialyse, chimiothérapie, radiothérapie.

alter table bookings
  add column if not exists is_hospitalization boolean not null default false;

comment on column bookings.is_hospitalization is
  'Indique si le transport est lié à une hospitalisation ou des soins répétés (dialyse, chimio, radio). '
  'Permet la facturation du retour à vide selon la convention nationale taxi 2025-2029 (art. 4).';
