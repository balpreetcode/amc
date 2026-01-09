# Embedding Workflow Builder

This guide explains how to embed the Flow Builder in your application using an iframe with user session authentication.

## Quick Start

```html
<iframe
  src="http://workflow.localhost/?sessiontoken=USER_SESSION_TOKEN"
  width="100%"
  height="800"
  frameborder="0"
  allow="clipboard-write"
></iframe>
```

## Implementation

### 1. Basic Embed

Replace `USER_SESSION_TOKEN` with a valid session token from your database:

```html
<iframe
  id="workflow-builder"
  src="http://workflow.localhost/?sessiontoken=abc123xyz"
  style="width: 100%; height: 100vh; border: none;"
  allow="clipboard-write"
></iframe>
```

### 2. Dynamic Session Token (JavaScript)

```javascript
// Get the user's session token from your auth system
const sessionToken = getCurrentUserSessionToken();

// Create the iframe dynamically
const iframe = document.createElement('iframe');
iframe.src = `http://workflow.localhost/?sessiontoken=${encodeURIComponent(sessionToken)}`;
iframe.style.cssText = 'width: 100%; height: 100vh; border: none;';
iframe.allow = 'clipboard-write';

document.getElementById('workflow-container').appendChild(iframe);
```

### 3. React Component

```jsx
function WorkflowEmbed({ sessionToken }) {
  const src = `http://workflow.localhost/?sessiontoken=${encodeURIComponent(sessionToken)}`;
  
  return (
    <iframe
      src={src}
      style={{ width: '100%', height: '100vh', border: 'none' }}
      allow="clipboard-write"
      title="Workflow Builder"
    />
  );
}

// Usage
<WorkflowEmbed sessionToken={user.sessionToken} />
```

### 4. Vue Component

```vue
<template>
  <iframe
    :src="workflowUrl"
    style="width: 100%; height: 100vh; border: none;"
    allow="clipboard-write"
  />
</template>

<script>
export default {
  props: ['sessionToken'],
  computed: {
    workflowUrl() {
      return `http://workflow.localhost/?sessiontoken=${encodeURIComponent(this.sessionToken)}`;
    }
  }
}
</script>
```

## Session Token Validation

The embedded workflow builder validates the `sessiontoken` parameter:

| Scenario | Result |
|----------|--------|
| Valid token | Workflow builder loads normally |
| Invalid/expired token | "Access Denied" message shown |
| No token provided | "Access Denied" message shown |

## Security Recommendations

1. **Generate unique tokens** per user session
2. **Set token expiry** in your database
3. **Use HTTPS** in production
4. **Implement CORS** if needed for cross-origin communication

## Production URL

For production, replace `workflow.localhost` with your production domain:

```html
<iframe src="https://workflow.yourdomain.com/?sessiontoken=TOKEN" ...></iframe>
```

## Example: Full Page Embed

```html
<!DOCTYPE html>
<html>
<head>
  <title>Workflow Builder</title>
  <style>
    body { margin: 0; padding: 0; }
    iframe { width: 100vw; height: 100vh; border: none; }
  </style>
</head>
<body>
  <iframe
    src="http://workflow.localhost/?sessiontoken=YOUR_TOKEN"
    allow="clipboard-write"
  ></iframe>
</body>
</html>
```
