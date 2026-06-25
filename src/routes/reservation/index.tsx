import { createFileRoute } from "@tanstack/react-router";
import { BookingForm } from "~/components/booking/BookingForm";

export const Route = createFileRoute("/reservation/")({
  head: () => ({
    meta: [
      { title: "Réserver mon taxi médical CPAM — Mon Taxi Santé" },
      {
        name: "description",
        content:
          "Réservez votre taxi conventionné Sécurité Sociale en 10 étapes simples. Tiers-Payant, zéro avance de frais. Formulaire sécurisé HDS.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReservationPage,
});

function ReservationPage() {
  return <BookingForm />;
}
