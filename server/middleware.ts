export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.signedCookies.user) { // <-- Cambiado a signedCookies
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
};

export const checkRole = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.signedCookies.user) { // <-- Cambiado a signedCookies
    return res.status(401).json({ error: "No autenticado" });
  }
  const user = JSON.parse(req.signedCookies.user);
  if (!roles.includes(user.role)) {
    return res.status(403).json({ error: "Acceso denegado" });
  }
  next();
};

export const sessionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userCookie = req.signedCookies.user; // <-- Cambiado a signedCookies
  if (userCookie) {
    res.cookie("user", userCookie, { 
      httpOnly: true, 
      sameSite: 'strict', 
      secure: true,
      signed: true, // <-- NUEVO: Indica que se debe firmar
      maxAge: 3600000 
    });
  }
  next();
};