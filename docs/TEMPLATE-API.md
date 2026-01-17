# Template APIs Documentation

## Base URL
```
http://localhost:3002
```

---

## 1. Get All Templates

**Endpoint:** `GET /api/templates`

**Description:** Retrieves the complete list of all workflow templates with their full configurations.

**Headers:**
| Header | Value | Required |
|--------|-------|----------|
| Content-Type | application/json | No |

**Response:**
```json
[
  {
    "id": "template-1768527344216-d5dd6a9c",
    "name": "test multi scene",
    "description": "",
    "createdAt": "2026-01-15T20:05:44.216Z",
    "lastModified": "2026-01-15T20:42:48.513Z",
    "videoPreview": "",
    "nodes": [
      {
        "id": "node-story-1",
        "type": "text_to_text",
        "title": "Generate Story",
        "config": {
          "prompt": "Write a story...",
          "temperature": 0.7
        },
        "execution": {
          "mode": "parallel",
          "waitForAll": true
        }
      }
    ],
    "nodeCount": 1,
    "templateVersion": 1,
    "userId": "dev-user"
  }
]
```

**cURL Example:**
```bash
curl -X GET http://localhost:3002/api/templates
```

---

## 2. Get Template by ID

**Endpoint:** `GET /api/template/:id`

**Description:** Retrieves complete details of a single workflow template including all nodes and their configurations.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | The unique template ID |

**Response:**
```json
{
  "id": "template-1768527344216-d5dd6a9c",
  "name": "test multi scene",
  "description": "",
  "createdAt": "2026-01-15T20:05:44.216Z",
  "lastModified": "2026-01-15T20:42:48.513Z",
  "videoPreview": "",
  "nodes": [
    {
      "id": "node-story-1",
      "type": "text_to_text",
      "title": "Generate Story",
      "config": {
        "prompt": "Write a story...",
        "temperature": 0.7,
        "systemPrompt": "You are a creative writer"
      },
      "execution": {
        "mode": "parallel",
        "waitForAll": true,
        "aggregateItems": true
      }
    },
    {
      "id": "node-image-1",
      "type": "text_to_image",
      "title": "Generate Image",
      "config": {
        "prompt": {
          "_type": "reference",
          "nodeId": "node-story-1",
          "outputKey": "text"
        },
        "aspectRatio": "16:9"
      }
    }
  ],
  "nodeCount": 2,
  "templateVersion": 1,
  "userId": "dev-user"
}
```

**Error Response (404):**
```json
{
  "error": "Template not found"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3002/api/template/template-1768527344216-d5dd6a9c
```

---

## 3. Create New Template

**Endpoint:** `POST /api/template`

**Description:** Creates a new workflow template by providing a template name and the complete JSON configuration of all nodes.

**Headers:**
| Header | Value | Required |
|--------|-------|----------|
| Content-Type | application/json | Yes |

**Request Body:**
```json
{
  "name": "My Video Workflow",
  "description": "A workflow to generate AI videos",
  "nodes": [
    {
      "id": "node-1",
      "type": "text_to_text",
      "title": "Generate Story",
      "config": {
        "prompt": "Write a short story about nature",
        "temperature": 0.7
      },
      "execution": {
        "mode": "parallel",
        "waitForAll": true
      }
    },
    {
      "id": "node-2",
      "type": "text_to_image",
      "title": "Generate Image",
      "config": {
        "prompt": {
          "_type": "reference",
          "nodeId": "node-1",
          "outputKey": "text"
        },
        "aspectRatio": "16:9"
      }
    }
  ],
  "videoPreview": ""
}
```

**Request Body Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Template name |
| description | string | No | Template description |
| nodes | array | Yes | Array of node configurations |
| videoPreview | string | No | URL to video preview |

**Node Configuration Object:**
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique node identifier |
| type | string | Node type (e.g., `text_to_text`, `text_to_image`, `image_to_video`) |
| title | string | Display title for the node |
| config | object | Node-specific configuration |
| execution | object | Execution mode settings |

**Success Response (200):**
```json
{
  "success": true,
  "template": {
    "id": "template-1768614932426-832ea6f7",
    "name": "My Video Workflow",
    "description": "A workflow to generate AI videos",
    "createdAt": "2026-01-16T20:25:32.426Z",
    "lastModified": "2026-01-16T20:25:32.426Z",
    "videoPreview": "",
    "nodes": [...],
    "nodeCount": 2,
    "templateVersion": 1,
    "userId": "dev-user"
  }
}
```

**Error Response (400):**
```json
{
  "error": "Name and nodes are required"
}
```

**Error Response (409):**
```json
{
  "error": "Template with this name already exists",
  "suggestion": "My Video Workflow (Copy)"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3002/api/template \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Video Workflow",
    "description": "A workflow to generate AI videos",
    "nodes": [
      {
        "id": "node-1",
        "type": "text_to_text",
        "title": "Generate Story",
        "config": {
          "prompt": "Write a short story",
          "temperature": 0.7
        }
      }
    ]
  }'
```

---

## Available Node Types

| Node Type | Description |
|-----------|-------------|
| `text_to_text` | Generate text from text prompt |
| `text_to_image` | Generate image from text prompt |
| `text_to_video` | Generate video from text prompt |
| `text_to_speech` | Convert text to speech audio |
| `text_to_music` | Generate music from text prompt |
| `image_to_video` | Animate an image into video |
| `image_to_image` | Transform/edit an image |
| `split_text` | Split text into segments |
| `edit_video` | Merge videos with audio |

---

## Node Reference System

Nodes can reference outputs from previous nodes using the reference object:

```json
{
  "prompt": {
    "_type": "reference",
    "nodeId": "node-story-1",
    "outputKey": "text"
  }
}
```

| Field | Description |
|-------|-------------|
| _type | Must be "reference" |
| nodeId | ID of the source node |
| outputKey | Output field to reference (e.g., "text", "imageUrl", "videoUrl") |
