import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { authService } from '../services/authService';

const LoginOverlay = ({ onClose, onSuccess }) => {
    const { login, addLog } = useStore();
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

    const handleLogin = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const user = await authService.login(username, password);
            login(user);
            addLog({ type: 'AUTH', action: 'LOGIN_SUCCESS', details: `Usuario ${user.username} autenticado.` });
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
            setError('As senhas nao conferem.');
            setIsLoading(false);
            return;
        }

        try {
            const user = await authService.resetPassword(resetUsername, resetPassword);
            setSuccess('Senha atualizada. Faca login com a nova senha.');
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
            setError('As senhas nao conferem.');
            setIsLoading(false);
            return;
        }

        try {
            const user = await authService.register({
                username: registerUsername,
                password: registerPassword,
                name: registerName
            });
            setSuccess('Conta criada. Faca login para continuar.');
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
            setError('Redefinicao de senha indisponivel neste modo.');
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
            setError('Cadastro indisponivel neste modo.');
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
                            <span>{resetMode ? 'Atualizando senha...' : 'Validando credenciais...'}</span>
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
                            <h2>Area do Organizador</h2>
                            <p>Acesso a administracao Genesis</p>
                        </div>
                    </div>
                    {canClose && (
                        <button type="button" className="btn btn-ghost login-close" onClick={onClose}>
                            Fechar
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
                            Usuario
                            <div className="login-input">
                                <User size={16} />
                                <input
                                    type="text"
                                    value={resetUsername}
                                    onChange={(event) => setResetUsername(event.target.value)}
                                    placeholder="Ex: simone"
                                    required
                                />
                            </div>
                        </label>
                        <label>
                            Nova senha
                            <div className="login-input">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    value={resetPassword}
                                    onChange={(event) => setResetPassword(event.target.value)}
                                    placeholder="Minimo 6 caracteres"
                                    required
                                />
                            </div>
                        </label>
                        <label>
                            Confirmar senha
                            <div className="login-input">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    value={resetConfirm}
                                    onChange={(event) => setResetConfirm(event.target.value)}
                                    placeholder="Repita a nova senha"
                                    required
                                />
                            </div>
                        </label>

                        <button className="btn btn-primary login-submit" type="submit" disabled={isLoading}>
                            Atualizar senha
                        </button>
                        <div className="login-helper">
                            <button type="button" className="login-link" onClick={handleCloseReset}>
                                Voltar ao login
                            </button>
                        </div>
                    </form>
                ) : registerMode ? (
                    <form onSubmit={handleRegister} className="login-form">
                        <label>
                            Nome completo
                            <div className="login-input">
                                <User size={16} />
                                <input
                                    type="text"
                                    value={registerName}
                                    onChange={(event) => setRegisterName(event.target.value)}
                                    placeholder="Ex: Davi Frois"
                                    required
                                />
                            </div>
                        </label>
                        <label>
                            Usuario
                            <div className="login-input">
                                <User size={16} />
                                <input
                                    type="text"
                                    value={registerUsername}
                                    onChange={(event) => setRegisterUsername(event.target.value)}
                                    placeholder="Ex: davifrois"
                                    required
                                />
                            </div>
                        </label>
                        <label>
                            Senha
                            <div className="login-input">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    value={registerPassword}
                                    onChange={(event) => setRegisterPassword(event.target.value)}
                                    placeholder="Minimo 6 caracteres"
                                    required
                                />
                            </div>
                        </label>
                        <label>
                            Confirmar senha
                            <div className="login-input">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    value={registerConfirm}
                                    onChange={(event) => setRegisterConfirm(event.target.value)}
                                    placeholder="Repita a senha"
                                    required
                                />
                            </div>
                        </label>

                        <button className="btn btn-primary login-submit" type="submit" disabled={isLoading}>
                            Criar conta
                        </button>
                        <div className="login-helper">
                            <button type="button" className="login-link" onClick={handleCloseRegister}>
                                Voltar ao login
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleLogin} className="login-form">
                        <label>
                            Usuario
                            <div className="login-input">
                                <User size={16} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    placeholder="Ex: simone"
                                    required
                                />
                            </div>
                        </label>
                        <label>
                            Senha de acesso
                            <div className="login-input">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="********"
                                    required
                                />
                            </div>
                        </label>

                        <button className="btn btn-primary login-submit" type="submit" disabled={isLoading}>
                            Autenticar organizador
                        </button>
                        <div className="login-helper">
                            {supportsLocalReset && (
                                <button type="button" className="login-link" onClick={handleOpenReset}>
                                    Esqueci minha senha
                                </button>
                            )}
                            {supportsLocalReset && (
                                <button type="button" className="login-link" onClick={handleOpenRegister}>
                                    Criar conta
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
