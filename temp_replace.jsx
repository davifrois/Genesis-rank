  const renderSettingsPage = ({ embedded = false } = {}) => (
    <form className={`smooth-settings-page ${embedded ? 'smooth-settings-page--embedded' : ''}`} onSubmit={handleSubmit}>
      <div className="smooth-settings-shell">
        <header className="smooth-settings-header">
          <h1>PROFILE SETTINGS</h1>
          <div className="smooth-settings-header__actions">
            <Link className="psa-btn psa-btn--profile" to={publicProfileUrl}>My Profile</Link>
            <button type="button" className="psa-btn psa-btn--share" onClick={() => navigator?.clipboard?.writeText(`${window.location.origin}${publicProfileUrl}`)}>Shared user data</button>
          </div>
        </header>

        <div className="smooth-settings-grid">
          <div className="smooth-settings-main">
            <section className="smooth-settings-card">
              <h2>User details</h2>
              {renderEditableTextRow('firstName', 'First name', form.firstName)}
              {renderEditableTextRow('middleName', 'Middle name', form.middleName)}
              {renderEditableTextRow('lastName', 'Last name', form.lastName)}
              {renderEditableTextRow('email', 'Email', form.email, { type: 'email' })}
              <div className="smooth-row">
                <span>Password</span>
                <strong>********</strong>
                <button type="button" onClick={handlePasswordReset}>edit</button>
              </div>
              {renderEditableSelectRow('country', 'Nationality', form.country || 'Brasil', [
                { value: 'Brasil', label: 'Brazil' },
                { value: 'United States', label: 'United States' },
                { value: 'Portugal', label: 'Portugal' },
                { value: 'Spain', label: 'Spain' }
              ], 'Select country')}
              {renderEditableTextRow('birthDate', 'Birthdate', form.birthDate, { type: 'date' })}
              {renderEditableSelectRow('gender', 'Gender', form.gender, [
                { value: 'Masculino', label: 'Male' },
                { value: 'Feminino', label: 'Female' },
                { value: 'Outro', label: 'Other' }
              ], 'Select gender')}
              <div className="smooth-row">
                <span>Language</span>
                <select value={form.language} onChange={(event) => setForm((previous) => ({ ...previous, language: event.target.value }))}>
                  <option value="">Select language</option>
                  <option value="pt-BR">Português</option>
                  <option value="en-US">English</option>
                  <option value="es-ES">Español</option>
                  <option value="fr-FR">Français</option>
                </select>
              </div>
            </section>

            <section className="smooth-settings-card">
              <h2>Contact &amp; residence</h2>
              {renderEditableTextRow('phone', 'Phone', form.phone, {
                onChange: (event) => setForm((previous) => ({ ...previous, phone: formatBrazilPhone(event.target.value) }))
              })}
              {renderEditableTextRow('address', 'Address', form.address, { multiline: true })}
              {renderEditableTextRow('zip', 'ZIP', form.zip)}
              {renderEditableTextRow('city', 'City', form.city)}
              {renderEditableTextRow('province', 'Province/State', form.province)}
              {renderEditableSelectRow('country', 'Country of residence', form.country || 'Brasil', [
                { value: 'Brasil', label: 'Brazil' },
                { value: 'United States', label: 'United States' },
                { value: 'Portugal', label: 'Portugal' },
                { value: 'Spain', label: 'Spain' }
              ], 'Select country')}
            </section>

            <section className="smooth-settings-card">
              <h2>Visibility</h2>
              <div className="smooth-public-toggle">
                <label>
                  <input type="checkbox" checked={!form.publicProfile} onChange={(event) => setForm((previous) => ({ ...previous, publicProfile: !event.target.checked }))} />
                  <span />
                  Hide public profile
                </label>
                <p>This setting hides your public profile page, however your name will still appear in the results list of events you have participated in.</p>
              </div>
            </section>

            <section className="smooth-settings-card smooth-media-card">
              <h2>Profile image <label>Edit<input type="file" accept="image/*" onChange={(event) => handleImageFile(event, 'photoUrl')} /></label></h2>
              <div className="smooth-profile-preview">
                {form.photoUrl ? <img src={form.photoUrl} alt={profileName} /> : <span>{profileName.slice(0, 1)}</span>}
              </div>
            </section>

            <section className="smooth-settings-card smooth-media-card">
              <h2>Cover image <label>Select image<input type="file" accept="image/*" onChange={(event) => handleImageFile(event, 'coverUrl')} /></label></h2>
              <div className="smooth-cover-preview">
                {form.coverUrl ? <img src={form.coverUrl} alt="Cover" /> : <Image size={92} />}
              </div>
            </section>

            <section className="smooth-settings-card">
              <h2>Belt / Skill level</h2>
              <div className="smooth-belt-row"><strong>JIU-JITSU (BJJ)</strong></div>
              <div className="smooth-belt-row">
                {editingFields.belt ? (
                  <select value={form.belt} onChange={(event) => setForm((previous) => ({ ...previous, belt: event.target.value }))}>
                    <option value="">Select belt</option>
                    {BELT_OPTIONS.map((belt) => <option key={belt} value={belt}>{belt}</option>)}
                  </select>
                ) : (
                  <span>{form.belt || 'Not set'}</span>
                )}
                <div>
                  <button type="button" title="Edit belt" onClick={() => toggleFieldEdit('belt')}><Pencil size={14} /></button>
                  <button type="button" title="Remove belt" onClick={() => clearField('belt')}><X size={16} /></button>
                </div>
              </div>
              <footer className="smooth-card-footer">
                <button type="button" className="smooth-blue-btn" onClick={() => toggleFieldEdit('belt')}>+ Add belt/level</button>
                <button type="button" className="smooth-gray-btn">History</button>
              </footer>
            </section>

            <section className="smooth-settings-card">
              <h2>Delete Account</h2>
              <div className="smooth-delete-row">
                <button type="button" onClick={handleDeleteAccount}>Delete account</button>
              </div>
            </section>
          </div>

          <aside className="smooth-settings-side">
            {/* --- YOUR ACADEMIES --- */}
            <section className="ps-card">
              <div className="ps-card__title">Your academies</div>
              <p className="ps-card__help">
                In this section you can select which academy, or be some cases which academics that you represent. By adding an academy to this list you accept that the responsible coach of that academy has the right to modify your application formalities and any restrictions for any competitions for the Genesis teams.
              </p>
              {(currentProfile?.academyName || currentUser?.academyName) ? (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>
                    {currentProfile?.academyName || currentUser?.academyName}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Status: {currentProfile?.joinStatus === 'pending' ? 'Pending Approval' : 'Approved'}
                  </div>
                </div>
              ) : null}
            </section>

            {/* --- JOIN ACADEMY --- */}
            <section className="ps-card">
              <div className="ps-card__title">Join academy</div>
              <div className="ps-field">
                <label className="ps-label">Academy/Club</label>
                <div className="ps-combo" style={{ position: 'relative' }}>
                  <input
                    className="ps-combo__input"
                    type="text"
                    placeholder="Search..."
                    value={joinDropdownOpen ? joinSearchTerm : (joinSelectedAcademy ? joinSelectedAcademy.name : joinSearchTerm)}
                    onChange={(e) => { setJoinSearchTerm(e.target.value); setJoinDropdownOpen(true); setJoinSelectedAcademy(null); }}
                    onFocus={() => setJoinDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setJoinDropdownOpen(false), 180)}
                  />
                  {joinDropdownOpen && (
                    <div className="ps-combo__dropdown">
                      {filteredJoinAcademies.length === 0
                        ? <div className="ps-combo__item ps-combo__item--empty">No academies found</div>
                        : filteredJoinAcademies.map((acc) => (
                          <div
                            key={acc.id}
                            className="ps-combo__item"
                            onMouseDown={() => { setJoinSelectedAcademy(acc); setJoinSearchTerm(acc.name); setJoinDropdownOpen(false); setForm((prev) => ({ ...prev, academyId: acc.id })); }}
                          >{acc.name}</div>
                        ))
                      }
                      <div className="ps-combo__footer">
                        <span>Can&#39;t find your Academy?</span>
                        <button type="button" className="ps-combo__register" onClick={() => navigate('/criar-academia')}>Register new</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="ps-field" style={{ marginTop: '1rem' }}>
                <label className="ps-label">Affiliation/Team</label>
                <p className="ps-affiliation">{joinSelectedAcademy ? (joinSelectedAcademy.affiliation || 'No team/association') : 'No team/association'}</p>
              </div>
              {academySuccess && <div className="ps-success">{academySuccess}</div>}
              {academyError && <div className="ps-error">{academyError}</div>}
              <button
                type="button"
                className="ps-join-btn"
                disabled={!joinSelectedAcademy}
                onClick={handleJoinExistingAcademy}
              >
                Join academy
              </button>
            </section>

            {/* --- LINKED ACCOUNTS --- */}
            <section className="ps-card">
              <div className="ps-card__title">Linked accounts</div>
              <button type="button" className="ps-add-btn">Add</button>
            </section>
          </aside>
        </div>

        {error && <div className="smooth-settings-message smooth-settings-message--error">{error}</div>}
        {success && <div className="smooth-settings-message smooth-settings-message--success">{success}</div>}

        <button type="submit" className="smooth-save-btn">Save changes</button>
      </div>
    </form>
  );

  if (!currentUser) {
    return <LoginOverlay redirectTo="/minha-conta" />;
  }

  if (shouldRenderSettingsPage) {
    return (
      <div className="smooth-settings-dashboard">
        {renderAccountSidebar()}
        <main className="smooth-settings-dashboard__content">
          {renderSettingsPage({ embedded: true })}
        </main>
      </div>
