import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does Fenix.AI integrate with existing patent management systems?",
    answer:
      "Fenix.AI seamlessly integrates with major patent management platforms through our robust API. We support direct integrations with USPTO systems, WIPO databases, and most IP management software.",
  },
  {
    question: "What level of accuracy can I expect from the AI-generated patent drafts?",
    answer:
      "Our AI consistently produces patent drafts with 95%+ accuracy for technical descriptions and claim structures. We always recommend attorney review for final submissions.",
  },
  {
    question: "Is my patent data secure and confidential with Fenix.AI?",
    answer:
      "Absolutely. We employ enterprise-grade security including end-to-end encryption and zero-trust architecture. Your data is never used to train our models or shared with third parties.",
  },
  {
    question: "How long does it typically take to implement Fenix.AI?",
    answer:
      "Most organizations are up and running within 2-4 weeks, including system integration, user training, and workflow optimization.",
  },
  {
    question: "Can I try Fenix.AI before committing to a subscription?",
    answer:
      "Yes — we offer a 14-day free trial with full access to all features. No credit card required.",
  },
];

const FAQSection = () => (
  <section className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">FAQs</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about Fenix.AI and how it can transform your patent management workflow.
          </p>
        </div>
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border border-border rounded-lg px-6 transition-all duration-300 hover:shadow-md"
            >
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="font-medium text-foreground pr-4">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </section>
);

export default FAQSection;