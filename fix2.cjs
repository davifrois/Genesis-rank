const fs = require('fs');

const replacement = `    const handleConfirmCloseEventRegistration = useCallback(async () => {
        const eventItem = registrationCloseConfirmEvent;
        if (!eventItem?.id) {
            setRegistrationCloseConfirmEvent(null);
            return;
        }
        try {
            const updated = await updateEvent(eventItem.id, {
                registrationOpen: false
            });
            showFeedback('success', copy.feedback.eventClosed(updated?.name || eventItem?.name));
        } catch (err) {
            const message = err?.message || copy.feedback.eventUpdateFail;
            showFeedback('error', message);
        } finally {
            setRegistrationCloseConfirmEvent(null);
        }
    }, [registrationCloseConfirmEvent, updateEvent, showFeedback, copy.feedback]);

    const handleEventEditPosterUrlChange = useCallback((event) => {
        const value = event.target.value;
        setEventEditForm((prev) => ({ ...prev, posterUrl: value }));
        setEventPosterStoredSizeBytes(isDataImageUrl(value) ? estimateDataUrlBytes(value) : 0);
    }, []);

    const handleOpenRegistrationEdit = useCallback((registration) => {
        setRegistrationEditForm({
            id: registration.id,
            categoria: registration.categoria || '',
            faixa: registration.faixa || '',
            peso: registration.peso || '',
            genero: registration.genero || '',
            modalidade: registration.modalidade || 'GI',
            isAbsolute: Boolean(registration.isAbsolute)
        });
        setShowRegistrationEditModal(true);
    }, []);

    const handleCloseRegistrationEdit = useCallback(() => {
        setShowRegistrationEditModal(false);
        setRegistrationEditForm(null);
        setRegistrationEditError('');
    }, []);

    const handleUpdateRegistration = useCallback(async (event) => {
        event.preventDefault();
        setRegistrationEditError('');
        try {
            await publicRegistrationService.updateRegistrationDetails(registrationEditForm.id, registrationEditForm);
            handleCloseRegistrationEdit();
            loadPublicRegistrations();
        } catch (err) {
            setRegistrationEditError(err?.message || 'Error updating registration.');
        }
    }, [registrationEditForm, handleCloseRegistrationEdit, loadPublicRegistrations]);`;

const path = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = "    const handleConfirmCloseEventRegistration = useCallback(async () => {\r\n            });\r\n    }, []);";
const target2 = "    const handleConfirmCloseEventRegistration = useCallback(async () => {\n            });\n    }, []);";

if (content.includes(target1)) {
    console.log("Found CRLF");
    content = content.replace(target1, replacement);
} else if (content.includes(target2)) {
    console.log("Found LF");
    content = content.replace(target2, replacement);
} else {
    console.log("NOT FOUND");
}

fs.writeFileSync(path, content, 'utf8');
