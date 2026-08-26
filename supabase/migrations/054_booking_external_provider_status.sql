-- Nouveau statut terminal 'external_provider' : la course est prise en
-- charge par un prestataire externe à Docteur Taxi (aucun chauffeur du
-- réseau n'est affecté). Utilisé depuis le panel admin quand aucun
-- chauffeur n'est trouvé et que le patient est finalement transporté par
-- un tiers.
--
-- ALTER TYPE ... ADD VALUE doit être commité seul (une valeur d'énum
-- ajoutée ne peut pas être utilisée dans la même transaction) : cette
-- migration ne contient donc que cet ajout.
ALTER TYPE public.booking_status ADD VALUE 'external_provider';
