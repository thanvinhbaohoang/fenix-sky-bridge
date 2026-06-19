import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

const posts = [
  {
    title: "How AI Is Reshaping Patent Prosecution in 2025",
    description: "From Office Action analysis to claim drafting, AI is becoming the patent attorney's most valuable assistant.",
    category: "AI",
    readTime: "6 min read",
    link: "https://medium.com/fenix-ai",
  },
  {
    title: "Automating USPTO Forms Without Losing Compliance",
    description: "A pragmatic guide to building automation that respects USPTO requirements and reduces filing errors.",
    category: "Automation",
    readTime: "5 min read",
    link: "https://medium.com/fenix-ai",
  },
  {
    title: "Trends in IP Management Software for Modern Law Firms",
    description: "What modern firms expect from IP platforms — and the gaps Fenix.AI is closing.",
    category: "Trends",
    readTime: "4 min read",
    link: "https://medium.com/fenix-ai",
  },
];

const tagColor = (c: string) =>
  ({
    AI: "bg-gray-200 text-foreground",
    Automation: "bg-gray-200 text-foreground",
    Trends: "bg-gray-200 text-foreground",
  })[c] || "bg-gray-100 text-foreground";

const BlogSection = () => (
  <section className="py-20 bg-muted">
    <div className="container mx-auto px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium mb-4">
            Blog
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Insights on Patent Automation
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our latest insights and updates on patent automation.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {posts.map((post) => (
            <Card key={post.title} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-background">
              <div className="aspect-[4/3] bg-surface-alt" />
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="secondary" className={`${tagColor(post.category)} border-0`}>
                    {post.category}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{post.readTime}</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3 line-clamp-2">{post.title}</h3>
                <p className="text-muted-foreground mb-4 line-clamp-2">{post.description}</p>
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-foreground hover:text-primary transition-colors font-medium"
                >
                  Read more <ArrowRight className="ml-1 w-4 h-4" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center">
          <Button variant="outline" size="lg" onClick={() => window.open("https://medium.com/fenix-ai", "_blank")}>
            View all posts
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default BlogSection;