import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { authService } from '../services/authService';

const LoginOverlay = ({ onClose, onSuccess }) => {
    const { login, addLog } = useStore();
    const { language } = useI18n();
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
    const [registerMode, setRegisterMode] = useState(false);
    const [resetUsername, setResetUsername] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetConfirm, setResetConfirm] = useState('');
    const supportsLocalReset = authService.isLocalAuth ? authService.isLocalAuth() : true;
    const canClose = typeof onClose === 'function';
    const isEnglish = language === 'en-US';
    const copy = isEnglish
        ? {
            loadingReset: 'Updating password...',
            loadingAuth: 'Validating credentials...',
            title: 'Organizer Area',
            subtitle: 'Access Genesis administration',
            close: 'Close',
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
                loginButton: 'Authenticate organizer',
                forgot: 'Forgot password',
                create: 'Create account'
            },
            reset: {
                title: 'New password',
                placeholder: 'Minimum 6 characters',
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
                passwordPlaceholder: 'Minimum 6 characters',
                confirm: 'Confirm password',
                confirmPlaceholder: 'Repeat password',
                button: 'Create account',
                back: 'Back to login'
            }
        }
        : {
            loadingReset: 'Atualizando senha...',
            loadingAuth: 'Validando credenciais...',
            title: 'Área do Organizador',
            subtitle: 'Acesso à administração Genesis',
            close: 'Fechar',
            resetUnavailable: 'Redefinição de senha indisponível neste modo.',
            registerUnavailable: 'Cadastro indisponível neste modo.',
            mismatch: 'As senhas não conferem.',
            resetSuccess: 'Senha atualizada. Faça login com a nova senha.',
            registerSuccess: 'Conta criada. Faça login para continuar.',
            form: {
                user: 'Usuário',
                userPlaceholder: 'Ex: simone',
                password: 'Senha de acesso',
                passwordPlaceholder: '********',
                loginButton: 'Autenticar organizador',
                forgot: 'Esqueci minha senha',
                create: 'Criar conta'
            },
            reset: {
                title: 'Nova senha',
                placeholder: 'Mínimo de 6 caracteres',
                confirm: 'Confirmar senha',
                confirmPlaceholder: 'Repita a nova senha',
                button: 'Atualizar senha',
                back: 'Voltar ao login'
            },
            register: {
                name: 'Nome completo',
                namePlaceholder: 'Ex: Davi Frois',
                user: 'Usuário',
                userPlaceholder: 'Ex: davifrois',
                password: 'Senha',
                passwordPlaceholder: 'Mínimo de 6 caracteres',
                confirm: 'Confirmar senha',
                confirmPlaceholder: 'Repita a senha',
                button: 'Criar conta',
                back: 'Voltar ao login'
            }
        };

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
            navigate(user?.role === 'admin' ? '/' : '/ranking');
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

        try {
            const user = await authService.register({
                username: registerUsername,
                password: registerPassword,
                name: registerName
            });
            setSuccess(copy.registerSuccess);
            addLog({ type: 'AUTH', action: 'REGISTER', details: `Conta criada: ${user.username}.` });
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
            className="login-overlay"
            onClick={canClose ? onClose : undefined}
        >
            <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="login-card"
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
                <div className="login-header-row">
                    <div className="login-header">
                        <div className="login-brand">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h2>{copy.title}</h2>
                            <p>{copy.subtitle}</p>
                        </div>
                    </div>
                    {canClose && (
                        <button type="button" className="btn btn-ghost login-close" onClick={onClose}>
                            {copy.close}
                        </button>
                    )}
                </div>

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
                                    value={resetPassword}
                                    onChange={(event) => setResetPassword(event.target.value)}
                                    placeholder={copy.reset.placeholder}
                                    required
                                />
                            </div>
                        </label>
                        <label>
                            {copy.reset.confirm}
                            <div className="login-input">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    value={resetConfirm}
                                    onChange={(event) => setResetConfirm(event.target.value)}
                                    placeholder={copy.reset.confirmPlaceholder}
                                    required
                                />
                            </div>
                        </label>

                        <button className="btn btn-primary login-submit" type="submit" disabled={isLoading}>
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
                                    value={registerPassword}
                                    onChange={(event) => setRegisterPassword(event.target.value)}
                                    placeholder={copy.register.passwordPlaceholder}
                                    required
                                />
                            </div>
                        </label>
                        <label>
                            {copy.register.confirm}
                            <div className="login-input">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    value={registerConfirm}
                                    onChange={(event) => setRegisterConfirm(event.target.value)}
                                    placeholder={copy.register.confirmPlaceholder}
                                    required
                                />
                            </div>
                        </label>

                        <button className="btn btn-primary login-submit" type="submit" disabled={isLoading}>
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
