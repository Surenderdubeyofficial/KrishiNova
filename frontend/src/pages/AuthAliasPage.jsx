import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthAliasPage({ target }) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/auth?target=${encodeURIComponent(target)}`, { replace: true });
  }, [navigate, target]);

  return null;
}
