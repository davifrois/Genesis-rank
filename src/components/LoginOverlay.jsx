import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { authService } from '../services/authService';
import { evaluatePasswordStrength } from '../utils/passwordStrength';

const LoginOverlay = ({ onClose, onSuccess, redirectTo = '', initialMode = 'login', pageMode = false }) => {
    const { login, addLog } = useStore();
    const { uiLanguage } = useI18n();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [registerName, setRegisterName] = useState('');
    const [registerUsername, setRegisterUsername] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerConfirm, setRegisterConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resetMode, setResetMode] = useState(false);
    const [registerMode, setRegisterMode] = useState(initialMode === 'register');
    const [resetUsername, setResetUsername] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetConfirm, setResetConfirm] = useState('');
    const supportsLocalReset = authService.isLocalAuth ? authService.isLocalAuth() : true;
    const canClose = typeof onClose === 'function';
    const isEnglish = uiLanguage === 'en-US';
    const isSpanish = uiLanguage === 'es-ES';
    const isFrench = uiLanguage === 'fr-FR';
    const registerPasswordStrength = useMemo(
        () => evaluatePasswordStrength(registerPassword, uiLanguage),
        [registerPassword, uiLanguage]
    );
    const resetPasswordStrength = useMemo(
        () => evaluatePasswordStrength(resetPassword, uiLanguage),
        [resetPassword, uiLanguage]
    );
    const copy = isEnglish
        ? {
            loadingReset: 'Updating password...',
            loadingAuth: 'Validating credentials...',
            title: 'Genesis Account',
            subtitle: 'Login or create your secure credential',
            close: 'Close',
            loginTab: 'Log in',
            resetUnavailable: 'Password reset is not available in this mode.',
            registerUnavailable: 'Registration is not available in this mode.',
            mismatch: 'Passwords do not match.',
            resetSuccess: 'Password updated. Please login with the new password.',
            registerSuccess: 'Account created. Login to continue.',
            form: {
                user: 'Username',
                userPlaceholder: 'Ex: simone',
                password: 'Password',
                passwordPlaceholder: '********',
                loginButton: 'Log in',
                forgot: 'Forgot password',
                create: 'Create account'
            },
            reset: {
                title: 'New password',
                placeholder: 'Minimum 8 characters with uppercase, lowercase, number, and symbol',
                confirm: 'Confirm password',
                confirmPlaceholder: 'Repeat the new password',
                button: 'Update password',
                back: 'Back to login'
            },
            register: {
                name: 'Full name',
                namePlaceholder: 'Ex: Davi Frois',
                user: 'Username',
                userPlaceholder: 'Ex: davifrois',
                password: 'Password',
                passwordPlaceholder: 'Minimum 8 characters with uppercase, lowercase, number, and symbol',
                confirm: 'Confirm password',
                confirmPlaceholder: 'Repeat password',
                button: 'Create account',
                back: 'Back to login'
            }
        }
        : isSpanish
            ? {
                loadingReset: 'Actualizando contrasena...',
                loadingAuth: 'Validando credenciales...',
                title: 'Cuenta Genesis',
                subtitle: 'Inicia sesion o crea tu credencial segura',
                close: 'Cerrar',
                loginTab: 'Iniciar sesion',
                resetUnavailable: 'La recuperacion de contrasena no esta disponible en este modo.',
                registerUnavailable: 'El registro no esta disponible en este modo.',
                mismatch: 'Las contrasenas no coinciden.',
                resetSuccess: 'Contrasena actualizada. Inicia sesion con la nueva contrasena.',
                registerSuccess: 'Cuenta creada. Inicia sesion para continuar.',
                form: {
                    user: 'Usuario',
                    userPlaceholder: 'Ej: simone',
                    password: 'Contrasena',
                    passwordPlaceholder: '********',
                    loginButton: 'Iniciar sesion',
                    forgot: 'Olvide mi contrasena',
                    create: 'Crear cuenta'
                },
                reset: {
                    title: 'Nueva contrasena',
                    placeholder: 'Minimo 8 caracteres con mayuscula, minuscula, numero y simbolo',
                    confirm: 'Confirmar contrasena',
                    confirmPlaceholder: 'Repite la nueva contrasena',
                    button: 'Actualizar contrasena',
                    back: 'Volver al login'
                },
                register: {
                    name: 'Nombre completo',
                    namePlaceholder: 'Ej: Davi Frois',
                    user: 'Usuario',
                    userPlaceholder: 'Ej: davifrois',
                    password: 'Contrasena',
                    passwordPlaceholder: 'Minimo 8 caracteres con mayuscula, minuscula, numero y simbolo',
                    confirm: 'Confirmar contrasena',
                    confirmPlaceholder: 'Repite la contrasena',
                    button: 'Crear cuenta',
                    back: 'Volver al login'
                }
            }
            : isFrench
                ? {
                    loadingReset: 'Mise a jour du mot de passe...',
                    loadingAuth: 'Validation des identifiants...',
                    title: 'Compte Genesis',
                    subtitle: 'Connectez-vous ou creez votre acces securise',
                    close: 'Fermer',
                    loginTab: 'Connexion',
                    resetUnavailable: 'La reinitialisation du mot de passe nest pas disponible dans ce mode.',
                    registerUnavailable: "Linscription nest pas disponible dans ce mode.",
                    mismatch: 'Les mots de passe ne correspondent pas.',
                    resetSuccess: 'Mot de passe mis a jour. Connectez-vous avec le nouveau mot de passe.',
                    registerSuccess: 'Compte cree. Connectez-vous pour continuer.',
                    form: {
                        user: 'Utilisateur',
                        userPlaceholder: 'Ex: simone',
                        password: 'Mot de passe',
                        passwordPlaceholder: '********',
                        loginButton: 'Connexion',
                        forgot: 'Mot de passe oublie',
                        create: 'Creer un compte'
                    },
                    reset: {
                        title: 'Nouveau mot de passe',
                        placeholder: 'Minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole',
                        confirm: 'Confirmer mot de passe',
                        confirmPlaceholder: 'Repetez le nouveau mot de passe',
                        button: 'Mettre a jour',
                        back: 'Retour au login'
                    },
                    register: {
                        name: 'Nom complet',
                        namePlaceholder: 'Ex: Davi Frois',
                        user: 'Utilisateur',
                        userPlaceholder: 'Ex: davifrois',
                        password: 'Mot de passe',
                        passwordPlaceholder: 'Minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole',
                        confirm: 'Confirmer mot de passe',
                        confirmPlaceholder: 'Repetez le mot de passe',
                        button: 'Creer un compte',
                        back: 'Retour au login'
                    }
                }
                : {
                    loadingReset: 'Atualizando senha...',
                    loadingAuth: 'Validando credenciais...',
                    title: 'Conta Genesis',
                    subtitle: 'Entre ou crie sua credencial segura',
                    close: 'Fechar',
                    loginTab: 'Entrar',
                    resetUnavailable: 'Redefinicao de senha indisponivel neste modo.',
                    registerUnavailable: 'Cadastro indisponivel neste modo.',
                    mismatch: 'As senhas nao conferem.',
                    resetSuccess: 'Senha atualizada. Faca login com a nova senha.',
                    registerSuccess: 'Conta criada. Faca login para continuar.',
                    form: {
                        user: 'Usuario',
                        userPlaceholder: 'Ex: simone',
                        password: 'Senha de acesso',
                        passwordPlaceholder: '********',
                        loginButton: 'Entrar',
                        forgot: 'Esqueci minha senha',
                        create: 'Criar conta'
                    },
                    reset: {
                        title: 'Nova senha',
                        placeholder: 'Minimo de 8 caracteres com maiuscula, minuscula, numero e simbolo',
                        confirm: 'Confirmar senha',
                        confirmPlaceholder: 'Repita a nova senha',
                        button: 'Atualizar senha',
                        back: 'Voltar ao login'
                    },
                    register: {
                        name: 'Nome completo',
                        namePlaceholder: 'Ex: Davi Frois',
                        user: 'Usuario',
                        userPlaceholder: 'Ex: davifrois',
                        password: 'Senha',
                        passwordPlaceholder: 'Minimo de 8 caracteres com maiuscula, minuscula, numero e simbolo',
                        confirm: 'Confirmar senha',
                        confirmPlaceholder: 'Repita a senha',
                        button: 'Criar conta',
                        back: 'Voltar ao login'
                    }
                };

    useEffect(() => {
        setResetMode(false);
        setRegisterMode(initialMode === 'register');
        setError('');
        setSuccess('');
    }, [initialMode]);

    const handleLogin = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const user = await authService.login(username, password);
            login(user);
            addLog({ type: 'AUTH', action: 'LOGIN_SUCCESS', details: `Usuário ${user.username} autenticado.` });
            if (onSuccess) {
                onSuccess(user);
            }
            if (canClose) {
                onClose();
            }
            const targetRoute = (redirectTo || '').toString().trim();
            if (targetRoute) {
                navigate(targetRoute, { replace: true });
            } else {
                const normalizedRole = (user?.role || '').toString().trim().toLowerCase();
                if (normalizedRole === 'mesario') {
                    navigate('/admin/mesa', { replace: true });
                } else if (normalizedRole === 'admin') {
                    navigate('/admin', { replace: true });
                } else {
                    navigate('/ranking', { replace: true });
                }
            }
        } catch (err) {
            setError(err.message);
            addLog({ type: 'AUTH', action: 'LOGIN_FAILURE', details: `Falha: ${username} - ${err.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');
        let resetCompleted = false;

        if (resetPassword !== resetConfirm) {
            setError(copy.mismatch);
            setIsLoading(false);
            return;
        }
        if (!resetPasswordStrength.isStrong) {
            setError(resetPasswordStrength.message);
            setIsLoading(false);
            return;
        }

        try {
            const user = await authService.resetPassword(resetUsername, resetPassword);
            setSuccess(copy.resetSuccess);
            addLog({ type: 'AUTH', action: 'RESET_PASSWORD', details: `Senha redefinida para ${user.username}.` });
            setUsername(user.username || resetUsername);
            setPassword('');
            resetCompleted = true;
        } catch (err) {
            setError(err.message);
            addLog({ type: 'AUTH', action: 'RESET_PASSWORD_FAILURE', details: `Falha: ${resetUsername} - ${err.message}` });
        } finally {
            setIsLoading(false);
            if (resetCompleted) {
                setResetMode(false);
            }
        }
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        if (registerPassword !== registerConfirm) {
            setError(copy.mismatch);
            setIsLoading(false);
            return;
        }
        if (!registerPasswordStrength.isStrong) {
            setError(registerPasswordStrength.message);
            setIsLoading(false);
            return;
        }

        try {
            const user = await authService.register({
                username: registerUsername,
                password: registerPassword,
                name: registerName
            });
            login(user);
            setSuccess(copy.registerSuccess);
            addLog({ type: 'AUTH', action: 'REGISTER', details: `Conta criada: ${user.username}.` });
            if (onSuccess) {
                onSuccess(user);
            }
            if (canClose) {
                onClose();
            }
            const targetRoute = (redirectTo || '').toString().trim();
            navigate(targetRoute || '/minha-conta', { replace: true });
            setUsername(user.username);
            setPassword('');
            setRegisterMode(false);
            setRegisterName('');
            setRegisterUsername('');
            setRegisterPassword('');
            setRegisterConfirm('');
        } catch (err) {
            setError(err.message);
            addLog({ type: 'AUTH', action: 'REGISTER_FAILURE', details: `Falha: ${registerUsername} - ${err.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenReset = () => {
        if (!supportsLocalReset) {
            setError(copy.resetUnavailable);
            return;
        }
        setResetMode(true);
        setRegisterMode(false);
        setResetUsername(username);
        setResetPassword('');
        setResetConfirm('');
        setError('');
        setSuccess('');
    };

    const handleCloseReset = () => {
        setResetMode(false);
        setResetPassword('');
        setResetConfirm('');
        setError('');
        setSuccess('');
    };

    const handleOpenRegister = () => {
        if (!supportsLocalReset) {
            setError(copy.registerUnavailable);
            return;
        }
        setRegisterMode(true);
        setResetMode(false);
        setRegisterName('');
        setRegisterUsername(username);
        setRegisterPassword('');
        setRegisterConfirm('');
        setError('');
        setSuccess('');
    };

    const handleCloseRegister = () => {
        setRegisterMode(false);
        setRegisterName('');
        setRegisterUsername('');
        setRegisterPassword('');
        setRegisterConfirm('');
        setError('');
        setSuccess('');
    };

    return (
        <div
            className={`login-overlay ${pageMode ? 'login-overlay--page' : ''}`}
            onClick={canClose ? onClose : undefined}
        >
            <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`login-card ${registerMode ? 'login-card--register' : ''} ${resetMode ? 'login-card--reset' : ''}`}
                onClick={(event) => event.stopPropagation()}
            >
                <AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="login-loading"
                        >
                            <Loader2 className="spin" size={32} />
                            <span>{resetMode ? copy.loadingReset : copy.loadingAuth}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <img
                    src="/genesis-logo.png"
                    alt="Genesis Esportes"
                    className="login-logo"
                    onError={(event) => {
                        event.currentTarget.style.display = 'none';
                    }}
                />

                {canClose && (
                    <button type="button" className="login-close-float" onClick={onClose} aria-label={copy.close}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}

                <div className="login-header-text">
                    <h2>{copy.title}</h2>
                    <p>{copy.subtitle}</p>
                </div>

                {supportsLocalReset && !resetMode && (
                    <div className="login-mode-switch" aria-label="Account access mode">
                        <div className="login-mode-slider" style={{ transform: registerMode ? 'translateX(100%)' : 'translateX(0)' }}></div>
                        <button
                            type="button"
                            className={!registerMode ? 'is-active' : ''}
                            onClick={() => {
                                handleCloseRegister();
                            }}
                        >
                            {copy.loginTab}
                        </button>
                        <button
                            type="button"
                            className={registerMode ? 'is-active' : ''}
                            onClick={handleOpenRegister}
                        >
                            {copy.form.create}
                        </button>
                    </div>
                )}

                {error && (
                    <div className="login-error" role="alert">
                        <AlertCircle size={18} />
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className="login-success" role="status">
                        <CheckCircle2 size={18} />
                        <p>{success}</p>
                    </div>
                )}

                {resetMode && supportsLocalReset ? (
                    <form onSubmit={handleResetPassword} className="login-form">
                        <label>
                            {copy.form.user}
                            <div className="login-input">
                                <User size={16} />
                                <input
                                    type="text"
                                    value={resetUsername}
                                    onChange={(event) => setResetUsername(event.target.value)}
                                    placeholder={copy.form.userPlaceholder}
                                    required
                                />
                            </div>
                        </label>
                        <label>
                            {copy.reset.title}
                            <div className="login-input">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    minLength={8}
                                    value={resetPassword}
                                    onChange={(event) => setResetPassword(event.target.value)}
                                    placeholder={copy.reset.placeholder}
                                    required
                                />
                            </div>
                            {resetPassword && (
                                <small className={`password-strength password-strength--${resetPasswordStrength.level}`}>
                                    {resetPasswordStrength.message}
                                </small>
                            )}
                        </label>
                        <label>
                            {copy.reset.confirm}
                            <div className="login-input">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    minLength={8}
                                    value={resetConfirm}
                                    onChange={(event) => setResetConfirm(event.target.value)}
                                    placeholder={copy.reset.confirmPlaceholder}
                                    required
                                />
                            </div>
                        </label>

                        <button
                            className="btn btn-primary login-submit"
                            type="submit"
                            disabled={isLoading || !resetPasswordStrength.isStrong}
                        >
                            {copy.reset.button}
                        </button>
                        <div className="login-helper">
                            <button type="button" className="login-link" onClick={handleCloseReset}>
                                {copy.reset.back}
                            </button>
                        </div>
                    </form>
                ) : registerMode ? (
                    <form onSubmit={handleRegister} className="login-form">
                        <label>
                            {copy.register.name}
                            <div className="login-input">
                                <User size={16} />
                                <input
                                    type="text"
                                    value={registerName}
                                    onChange={(event) => setRegisterName(event.target.value)}
                                    placeholder={copy.register.namePlaceholder}
                                    required
                                />
                            </div>
                        </label>
                        <label>
                            {copy.register.user}
                            <div className="login-input">
                                <User size={16} />
                                <input
                                    type="text"
                                    value={registerUsername}
                                    onChange={(event) => setRegisterUsername(event.target.value)}
                                    placeholder={copy.register.userPlaceholder}
                                    required
                                />
                            </div>
                        </label>
                        <label>
                            {copy.register.password}
                            <div className="login-input">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    minLength={8}
                                    value={registerPassword}
                                    onChange={(event) => setRegisterPassword(event.target.value)}
                                    placeholder={copy.register.passwordPlaceholder}
                                    required
                                />
                            </div>
                            {registerPassword && (
                                <small className={`password-strength password-strength--${registerPasswordStrength.level}`}>
                                    {registerPasswordStrength.message}
                                </small>
                            )}
                        </label>
                        <label>
                            {copy.register.confirm}
                            <div className="login-input">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    minLength={8}
                                    value={registerConfirm}
                                    onChange={(event) => setRegisterConfirm(event.target.value)}
                                    placeholder={copy.register.confirmPlaceholder}
                                    required
                                />
                            </div>
                        </label>

                        <button
                            className="btn btn-primary login-submit"
                            type="submit"
                            disabled={isLoading || !registerPasswordStrength.isStrong}
                        >
                            {copy.register.button}
                        </button>
                        <div className="login-helper">
                            <button type="button" className="login-link" onClick={handleCloseRegister}>
                                {copy.register.back}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleLogin} className="login-form">
                        <label>
                            {copy.form.user}
                            <div className="login-input">
                                <User size={16} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    placeholder={copy.form.userPlaceholder}
                                    required
                                />
                            </div>
                        </label>
                        <label>
                            {copy.form.password}
                            <div className="login-input">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder={copy.form.passwordPlaceholder}
                                    required
                                />
                            </div>
                        </label>

                        <button className="btn btn-primary login-submit" type="submit" disabled={isLoading}>
                            {copy.form.loginButton}
                        </button>
                        <div className="login-helper">
                            {supportsLocalReset && (
                                <button type="button" className="login-link" onClick={handleOpenReset}>
                                    {copy.form.forgot}
                                </button>
                            )}
                            {supportsLocalReset && (
                                <button type="button" className="login-link" onClick={handleOpenRegister}>
                                    {copy.form.create}
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

export default LoginOverlay;

