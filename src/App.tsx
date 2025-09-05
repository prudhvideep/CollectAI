import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RLCollectionAgent from "./components/CollectionAgent";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RLCollectionAgent />} />
      </Routes>
    </Router>
  );
}
