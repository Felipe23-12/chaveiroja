import { useLocation, useNavigate } from 'react-router-dom';

export default function useMobileMenuHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const open = location.hash === '#menu';
  const openMenu = () => {
    if (open) return;
    navigate({ pathname: location.pathname, search: location.search, hash: '#menu' }, {
      state: { ...location.state, mobileMenuReturnHash: location.hash },
    });
  };
  const closeMenu = () => {
    if (!open) return;
    if (typeof location.state?.mobileMenuReturnHash === 'string') navigate(-1);
    else navigate({ pathname: location.pathname, search: location.search, hash: '' }, { replace: true, state: location.state });
  };
  const navigateFromMenu = event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    // Replace the menu entry, rather than racing a Back with the link navigation.
    navigate(event.currentTarget.getAttribute('href'), { replace: true });
  };
  return { open, openMenu, closeMenu, navigateFromMenu };
}