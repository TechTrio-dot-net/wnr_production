# CMS Usage Guide

## Overview

The CMS (Content Management System) allows you to manage all website content directly from the admin panel. Any changes made in the admin UI will be available to the client website via API.

## Admin UI - Managing Content

### Access CMS
1. Log into the admin panel
2. Click "CMS" in the sidebar
3. View all content items or filter by type

### Create New Content
1. Click "Add Content"
2. Fill in:
   - **Type**: Select content type (homepage_hero, faq, contact_info, etc.)
   - **Key**: Unique identifier (e.g., "hero_title", "contact_email")
   - **Title**: Optional title
   - **Content**: Plain text or JSON
   - **Metadata**: Optional JSON for images, links, etc.
   - **Order**: Display order (lower numbers first)
   - **Active**: Toggle to show/hide on website
3. Click "Create"

### Edit Content
1. Click the edit icon (pencil) on any content item
2. Modify the fields
3. Click "Save Changes"

### Toggle Visibility
- Click the Active/Inactive button to show/hide content on the website

## Client Integration

### Using the CMS API

```typescript
import { getContent, getContentByType, getContentString } from "@/lib/cms";

// Get a single content item
const content = await getContent("contact_info", "email_info");

// Get all FAQs
const faqs = await getContentByType("faq");

// Get content as string
const title = await getContentString("homepage_hero", "title", "Default Title");
```

### Using the React Hook

```typescript
import { useCMSContent, useCMSContentByType } from "@/hooks/useCMS";

function MyComponent() {
  const { content, loading } = useCMSContent("contact_info", "email_info");
  
  if (loading) return <div>Loading...</div>;
  if (!content) return <div>No content</div>;
  
  return <div>{typeof content.content === "string" ? content.content : JSON.stringify(content.content)}</div>;
}
```

### Using the CMS Component

```typescript
import CMSContent from "@/components/cms/CMSContent";

// Simple usage
<CMSContent 
  type="homepage_hero" 
  key="title" 
  fallback="Default Title" 
/>

// With custom render
<CMSContent
  type="faq"
  key="shipping"
  render={(content) => (
    <div>
      <h3>{content.title}</h3>
      <p>{content.content}</p>
    </div>
  )}
/>
```

## Content Type Examples

### Homepage Hero
- Type: `homepage_hero`
- Keys: `title`, `subtitle`, `description`, `cta_text`, `cta_link`
- Content: String or JSON

### Contact Information
- Type: `contact_info`
- Keys: `email_info`, `email_care`, `phone_sales`, `phone_care`, `address`
- Content: String

### FAQ
- Type: `faq`
- Keys: `faq_1`, `faq_2`, etc. (or use order field)
- Content: JSON `{ "question": "...", "answer": "...", "category": "..." }`

### About Page
- Type: `about_page`
- Keys: `section_1`, `section_2`, `certificates`, etc.
- Content: String or JSON

## Migration Strategy

To migrate existing hardcoded content to CMS:

1. **Identify content** to migrate (FAQ, Contact info, etc.)
2. **Create CMS entries** in admin panel with matching keys
3. **Update client code** to fetch from CMS API
4. **Test** that content displays correctly
5. **Remove** hardcoded content

## Best Practices

- Use descriptive keys (e.g., `hero_title` not `title`)
- Group related content by type
- Use JSON for structured content (FAQ, benefits, etc.)
- Keep fallback values in client code for offline/error cases
- Test content changes in admin before making them active
