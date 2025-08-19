interface FirecrawlResponse {
  success: boolean;
  data?: {
    content: string;
    metadata?: any;
  };
  error?: string;
}

export async function scrapeReference(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_KEY || "";
  
  if (!apiKey) {
    throw new Error("Firecrawl API key not configured");
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v0/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: url,
        formats: ["markdown"],
        onlyMainContent: true,
        includeTags: ["h1", "h2", "h3", "p", "div", "section", "article"],
        excludeTags: ["script", "style", "nav", "footer", "aside"],
      }),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
    }

    const data: FirecrawlResponse = await response.json();
    
    if (!data.success || !data.data?.content) {
      throw new Error(data.error || "Failed to scrape content");
    }

    return data.data.content;
  } catch (error) {
    console.error("Firecrawl scraping error:", error);
    throw new Error(`Failed to scrape reference site: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function scrapeMultipleReferences(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(
    urls.map(url => scrapeReference(url))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
    .map(result => result.value);
}
