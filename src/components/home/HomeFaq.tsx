import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function HomeFaq() {
  const faqs = [
    {
      q: 'How does the buyer receive the courier receipt on WhatsApp?',
      a: 'Once your package is booked at the SACCO or with the courier driver by our dispatch team, we take a high-resolution photograph of the official stamped booking slip. With one tap, an automated WhatsApp message is delivered directly to the buyer’s Kenyan phone number containing their tracking number, courier name, and a short secure link to the photo.',
    },
    {
      q: 'How do I get my customized /order/shop link for my TikTok/Instagram bio?',
      a: 'When you sign in to your seller portal, your unique order link (e.g. pataparcel.app/order/your-brand) is automatically generated. You can share this link in your social media bio, WhatsApp status, or broadcast channels. Orders submitted by buyers flow straight into your dispatch dashboard.',
    },
    {
      q: 'Which SACCOs and courier companies do you work with?',
      a: 'We connect with over 100+ vetted SACCOs across Kenya including 2NK, Super Metro, Ena Coach, Tulaga, Latema, Tahmid, Dreamline, Lopha, Kukena, 4NT, Unique, Luxury, and vetted PSV Drivers on delivery. We also integrate with Pick-Up Mtaani lockers and door-to-door courier services in Nairobi.',
    },
    {
      q: 'Can buyers pay on delivery?',
      a: 'Yes! Sellers can dispatch via PSV-Driver on-delivery, where the recipient pays the sending fee upon receiving their parcel, with driver name, phone number, and vehicle registration plate tracked inside the system.',
    },
    {
      q: 'How does Pata Parcel prevent fake M-PESA confirmations and fraud?',
      a: 'Pata Parcel enforces automated payment code reservations and phone reuse counters in database trigger functions. Fraudulent confirmation attempts and repeated spam submissions are logged as committed rejections, stopping code recycling before packages are released.',
    },
    {
      q: 'Can I print my receipts in bulk to PDF for bookkeeping?',
      a: 'Yes! Inside the Seller and Operations portals, you can select any number of receipts and click "Bulk Print to PDF". The system generates clean, print-ready dossiers with tracking codes, customer details, and high-resolution receipt slips.',
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-6">
      <div className="text-center space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          Frequently Asked Questions
        </span>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Got Questions? We’ve Got Answers
        </h3>
        <p className="text-xs text-muted-foreground">
          Everything you need to know about dispatching with Pata Parcel Kenya.
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-2">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`item-${i}`}
            className="rounded-xl border border-border/80 bg-card px-4 py-1 shadow-sm"
          >
            <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline text-foreground text-left py-3">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed pt-1 pb-3">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
