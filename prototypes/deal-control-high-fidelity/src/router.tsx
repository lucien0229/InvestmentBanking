import { createContext, forwardRef, useContext, useEffect, useMemo, useState } from 'react';
import type { AnchorHTMLAttributes, MouseEvent, PropsWithChildren } from 'react';

interface RouterContextValue {
  pathname: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

interface RouterProviderProps extends PropsWithChildren {
  initialPath?: string;
}

function currentBrowserPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function RouterProvider({ initialPath, children }: RouterProviderProps) {
  const [pathname, setPathname] = useState(initialPath ?? currentBrowserPath());

  useEffect(() => {
    const onPopState = () => setPathname(currentBrowserPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const value = useMemo<RouterContextValue>(() => ({
    pathname,
    navigate: (to, options) => {
      if (options?.replace) window.history.replaceState(null, '', to);
      else window.history.pushState(null, '', to);
      setPathname(to);
      const hash = new URL(to, window.location.href).hash;
      window.requestAnimationFrame(() => {
        const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
        window.scrollTo({ top: target ? Math.max(target.offsetTop - 144, 0) : 0, left: 0, behavior: 'auto' });
      });
    },
  }), [pathname]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouter() {
  const value = useContext(RouterContext);
  if (!value) throw new Error('Router components must be used inside RouterProvider');
  return value;
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, onClick, target, ...props }, ref) {
  const { navigate } = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || target === '_blank') return;
    event.preventDefault();
    navigate(to);
  }

  return <a {...props} ref={ref} href={to} target={target} onClick={handleClick} />;
});

interface NavLinkProps extends Omit<LinkProps, 'className'> {
  className?: string | ((state: { isActive: boolean }) => string);
  end?: boolean;
}

export function NavLink({ to, className, end = false, ...props }: NavLinkProps) {
  const { pathname } = useRouter();
  const currentPath = pathname.split(/[?#]/)[0];
  const targetPath = to.split(/[?#]/)[0];
  const isActive = currentPath === targetPath || (!end && currentPath.startsWith(`${targetPath}/`));
  return (
    <Link
      {...props}
      to={to}
      className={typeof className === 'function' ? className({ isActive }) : className}
      aria-current={isActive ? 'page' : undefined}
    />
  );
}

export function useNavigate() {
  return useRouter().navigate;
}

export function useLocation() {
  return { pathname: useRouter().pathname };
}
