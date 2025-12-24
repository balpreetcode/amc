import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import { StudioHome } from "./screens/StudioHome"
import { TemplatesLibrary } from "./screens/TemplatesLibrary"
import { GenerationsQueue } from "./screens/GenerationsQueue"
import { AssetLibrary } from "./screens/AssetLibrary"
import { BrandKit } from "./screens/BrandKit"
import { ProjectWorkbench } from "./screens/ProjectWorkbench"

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/studio" replace />} />
          <Route path="/studio" element={<StudioHome />} />
          <Route path="/project/new" element={<StudioHome initialCreateOpen={true} />} />
          <Route path="/project/:projectId" element={<ProjectWorkbench />} />
          <Route path="/templates" element={<TemplatesLibrary />} />
          <Route path="/generations" element={<GenerationsQueue />} />
          <Route path="/assets" element={<AssetLibrary />} />
          <Route path="/brand-kit" element={<BrandKit />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
