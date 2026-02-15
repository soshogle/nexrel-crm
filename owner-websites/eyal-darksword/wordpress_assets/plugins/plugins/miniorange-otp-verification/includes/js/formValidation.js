jQuery(document).ready(function () {
    window.$mo = window.$mo || window.jQuery;
    const $mo = window.$mo;
    
    // Form validation
    $mo("#ov_settings_button,#ov_settings_button_config").click(function (e) {
        e.preventDefault();
        const $btn = $mo(this).prop('disabled', true);
        $mo('#error_message').val('');
        if (!$mo("#wp_default").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_wp_default_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_wp_default_enable_type]').prop("checked", false);
            }
        } else {
            if (!$mo('input[name=mo_customer_validation_wp_default_enable_type]').is(':checked') &&
                !$mo('input[name=mo_customer_validation_wp_reg_auto_activate]').is(':checked')) {
                $mo('#error_message').val($mo('#error_message').val() + 'WP_CHOOSE_METHOD ');
                $mo("#wp_default").prop("checked", false);
            }
        }

        // WooCommerce default form
        if (!$mo("#wc_default").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_wc_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_wc_enable_type]').prop("checked", false);
            }
        } else {
            if (!$mo('input[name=mo_customer_validation_wc_enable_type]').is(':checked')) {
                $mo('#error_message').val($mo('#error_message').val() + 'WC_CHOOSE_METHOD ');
                $mo("#wc_default").prop("checked", false);
            }
        }

        // Simplr form
        if (!$mo("#simplr_default").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_simplr_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_simplr_enable_type]').prop("checked", false);
            }
            $mo('input[name=mo_customer_validation_simplr_phone_field_key]').val('');
        } else {
            if ($mo('input[name=mo_customer_validation_simplr_enable_type]').is(':checked')) {
                if ($mo('#simplr_phone').is(':checked')) {
                    if ($mo('#mo_customer_validation_simplr_phone_field_key1').val() === '') {
                        $mo("#simplr_default").prop("checked", false);
                        $mo('#simplr_phone').prop("checked", false);
                        $mo('input[name=mo_customer_validation_simplr_phone_field_key]').val('');
                        $mo('#error_message').val($mo('#error_message').val() + 'SMPLR_PROVIDE_FIELD ');
                    } else {
                        $mo('input[name=mo_customer_validation_simplr_phone_field_key]').val($mo('#mo_customer_validation_simplr_phone_field_key1').val());
                    }
                } else if ($mo('#simplr_both').is(':checked')) {
                    if ($mo('#mo_customer_validation_simplr_phone_field_key2').val() === '') {
                        $mo("#simplr_default").prop("checked", false);
                        $mo('#simplr_both').prop("checked", false);
                        $mo('input[name=mo_customer_validation_simplr_phone_field_key]').val('');
                        $mo('#error_message').val($mo('#error_message').val() + 'SMPLR_PROVIDE_FIELD ');
                    } else {
                        $mo('input[name=mo_customer_validation_simplr_phone_field_key]').val($mo('#mo_customer_validation_simplr_phone_field_key2').val());
                    }
                } else {
                    $mo('input[name=mo_customer_validation_simplr_phone_field_key]').val('');
                }
            } else {
                $mo("#simplr_default").prop("checked", false);
                $mo('#error_message').val($mo('#error_message').val() + 'SIMPLR_CHOOSE ');
            }
        }

        // User Ultra form
        if (!$mo("#uultra_default").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_uultra_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_uultra_enable_type]').prop("checked", false);
            }
            $mo('input[name=mo_customer_validation_uultra_phone_field_key]').val('');
        } else {
            if ($mo('input[name=mo_customer_validation_uultra_enable_type]').is(':checked')) {
                if ($mo('#uultra_phone').is(':checked')) {
                    if ($mo('#mo_customer_validation_uultra_phone_field_key').val() === '') {
                        $mo("#uultra_default").prop("checked", false);
                        $mo('#uultra_phone').prop("checked", false);
                        $mo('input[name=mo_customer_validation_uultra_phone_field_key]').val('');
                        $mo('#error_message').val($mo('#error_message').val() + 'UULTRA_PROVIDE_FIELD');
                    } else {
                        $mo('input[name=mo_customer_validation_uultra_phone_field_key]').val($mo('#mo_customer_validation_uultra_phone_field_key').val());
                    }
                } else if ($mo('#uultra_both').is(':checked')) {
                    if ($mo('#mo_customer_validation_uultra_phone_field_key1').val() === '') {
                        $mo("#uultra_default").prop("checked", false);
                        $mo('#uultra_both').prop("checked", false);
                        $mo('input[name=mo_customer_validation_uultra_phone_field_key]').val('');
                        $mo('#error_message').val($mo('#error_message').val() + 'UULTRA_PROVIDE_FIELD');
                    } else {
                        $mo('input[name=mo_customer_validation_uultra_phone_field_key]').val($mo('#mo_customer_validation_uultra_phone_field_key1').val());
                    }
                } else {
                    $mo('input[name=mo_customer_validation_uultra_phone_field_key]').val('');
                }
            } else {
                $mo("#uultra_default").prop("checked", false);
                $mo('#error_message').val($mo('#error_message').val() + 'UULTRA_CHOOSE');
            }
        }

        // CRF form
        if (!$mo("#crf_default").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_crf_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_crf_enable_type]').prop("checked", false);
            }
            $mo('input[name^="crf_form"]').each(function () {
                $mo(this).val('');
            });
        } else {
            if (!$mo('input[name=mo_customer_validation_crf_enable_type]').is(':checked')) {
                $mo("#crf_default").prop("checked", false);
                $mo('#error_message').val($mo('#error_message').val() + 'CRF_CHOOSE');
            }
        }

        // Profile Builder
        if (!$mo("#pb_default").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_pb_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_pb_enable_type]').prop("checked", false);
            }
            $mo('input[name=mo_customer_validation_pb_phone_field_key]').val('');
        } else {
            if ($mo('input[name=mo_customer_validation_pb_enable_type]').is(':checked')) {
                if ($mo('#pb_phone').is(':checked')) {
                    if ($mo('#mo_customer_validation_pb_phone_field_key').val() === '') {
                        $mo("#pb_default").prop("checked", false);
                        $mo('#pb_phone').prop("checked", false);
                        $mo('input[name=mo_customer_validation_pb_phone_field_key]').val('');
                        $mo('#error_message').val($mo('#error_message').val() + 'PB_PROVIDE_PHONE_KEY ');
                    } else {
                        $mo('input[name=mo_customer_validation_pb_phone_field_key]').val($mo('#mo_customer_validation_pb_phone_field_key').val());
                    }
                } else if ($mo('#pb_both').is(':checked')) {
                    if ($mo('#mo_customer_validation_pb_phone_field_key1').val() === '') {
                        $mo("#pb_default").prop("checked", false);
                        $mo('#pb_both').prop("checked", false);
                        $mo('input[name=mo_customer_validation_pb_phone_field_key]').val('');
                        $mo('#error_message').val($mo('#error_message').val() + 'PB_PROVIDE_PHONE_KEY ');
                    } else {
                        $mo('input[name=mo_customer_validation_pb_phone_field_key]').val($mo('#mo_customer_validation_pb_phone_field_key1').val());
                    }
                } else {
                    $mo('input[name=mo_customer_validation_pb_phone_field_key]').val('');
                }
            } else {
                $mo("#pb_default").prop("checked", false);
                $mo('#error_message').val($mo('#error_message').val() + 'PB_CHOOSE ');
            }
        }

        // UserProfile Made Easy
        if (!$mo("#upme_default").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_upme_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_upme_enable_type]').prop("checked", false);
            }
            $mo('input[name=mo_customer_validation_upme_phone_field_key]').val('');
        } else {
            if ($mo('input[name=mo_customer_validation_upme_enable_type]').is(':checked')) {
                if ($mo('#upme_phone').is(':checked')) {
                    if ($mo('#mo_customer_validation_upme_phone_field_key').val() === '') {
                        $mo("#upme_default").prop("checked", false);
                        $mo('#upme_phone').prop("checked", false);
                        $mo('input[name=mo_customer_validation_upme_phone_field_key]').val('');
                        $mo('#error_message').val($mo('#error_message').val() + 'UPME_PROVIDE_PHONE_KEY ');
                    } else {
                        $mo('input[name=mo_customer_validation_upme_phone_field_key]').val($mo('#mo_customer_validation_upme_phone_field_key').val());
                    }
                } else if ($mo('#upme_both').is(':checked')) {
                    if ($mo('#mo_customer_validation_upme_phone_field_key1').val() === '') {
                        $mo("#upme_default").prop("checked", false);
                        $mo('#upme_both').prop("checked", false);
                        $mo('input[name=mo_customer_validation_upme_phone_field_key]').val('');
                        $mo('#error_message').val($mo('#error_message').val() + 'UPME_PROVIDE_PHONE_KEY ');
                    } else {
                        $mo('input[name=mo_customer_validation_upme_phone_field_key]').val($mo('#mo_customer_validation_upme_phone_field_key1').val());
                    }
                } else {
                    $mo('input[name=mo_customer_validation_upme_phone_field_key]').val('');
                }
            } else {
                $mo("#upme_default").prop("checked", false);
                $mo('#error_message').val($mo('#error_message').val() + 'UPME_CHOOSE ');
            }
        }

        // Pie Registration
        if (!$mo("#pie_default").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_pie_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_pie_enable_type]').prop("checked", false);
            }
            $mo('input[name=mo_customer_validation_pie_phone_field_key]').val('');
        } else {
            if ($mo('input[name=mo_customer_validation_pie_enable_type]').is(':checked')) {
                if ($mo('#pie_phone').is(':checked')) {
                    if ($mo('#mo_customer_validation_pie_phone_field_key').val() === '') {
                        $mo("#pie_default").prop("checked", false);
                        $mo('#pie_phone').prop("checked", false);
                        $mo('input[name=mo_customer_validation_pie_phone_field_key]').val('');
                        $mo('#error_message').val($mo('#error_message').val() + 'PIE_PROVIDE_PHONE_KEY ');
                    } else {
                        $mo('input[name=mo_customer_validation_pie_phone_field_key]').val($mo('#mo_customer_validation_pie_phone_field_key').val());
                    }
                } else if ($mo('#pie_both').is(':checked')) {
                    if ($mo('#mo_customer_validation_pie_both_field_key').val() === '') {
                        $mo("#pie_default").prop("checked", false);
                        $mo('#pie_both').prop("checked", false);
                        $mo('input[name=mo_customer_validation_pie_phone_field_key]').val('');
                        $mo('#error_message').val($mo('#error_message').val() + 'PIE_PROVIDE_PHONE_KEY ');
                    } else {
                        $mo('input[name=mo_customer_validation_pie_phone_field_key]').val($mo('#mo_customer_validation_pie_both_field_key').val());
                    }
                } else {
                    $mo('input[name=mo_customer_validation_pie_phone_field_key]').val('');
                }
            } else {
                $mo("#pie_default").prop("checked", false);
                $mo('#error_message').val($mo('#error_message').val() + 'PIE_CHOOSE ');
            }
        }

        // UserPro form
        if (!$mo("#userpro_registration").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_userpro_registration_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_userpro_registration_type]').prop("checked", false);
            }
        } else {
            if (!$mo('input[name=mo_customer_validation_userpro_registration_type]').is(':checked')) {
                $mo('#error_message').val($mo('#error_message').val() + 'USERPRO_CHOOSE ');
                $mo("#userpro_registration").prop("checked", false);
            }
        }

        // Gravity Form
        if (!$mo("#gf_contact").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_gf_contact_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_gf_contact_type]').prop("checked", false);
            }
            $mo('input[name^="gravity_form"]').each(function () {
                $mo(this).val('');
            });
        } else {
            if (!$mo('input[name=mo_customer_validation_gf_contact_type]').is(':checked')) {
                $mo("#gravity").prop("checked", false);
                $mo('#error_message').val($mo('#error_message').val() + 'GRAVITY_CHOOSE');
            }
        }

        // Ultimate Pro form
        if (!$mo("#ultimatepro").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_ultipro_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_ultipro_type]').prop("checked", false);
            }
        } else {
            if (!$mo('input[name=mo_customer_validation_ultipro_type]').is(':checked')) {
                $mo('#error_message').val($mo('#error_message').val() + 'UMPRO_CHOOSE');
                $mo("#ultimatepro").prop("checked", false);
            }
        }

        // Classify theme
        if (!$mo("#classify_theme").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_classify_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_classify_type]').prop("checked", false);
            }
        } else {
            if (!$mo('input[name=mo_customer_validation_classify_type]').is(':checked')) {
                $mo('#error_message').val($mo('#error_message').val() + 'CLASSIFY_THEME');
                $mo("#classify_theme").prop("checked", false);
            }
        }

        // Reales theme
        if (!$mo("#reales_reg").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_reales_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_reales_enable_type]').prop("checked", false);
            }
        } else {
            if (!$mo('input[name=mo_customer_validation_reales_enable_type]').is(':checked')) {
                $mo('#error_message').val($mo('#error_message').val() + 'REALES_THEME');
                $mo("#reales_reg").prop("checked", false);
            }
        }

        // Default Login Form
        if (!$mo("#wp_login").is(':checked')) {
            $mo('input[name=mo_customer_validation_wp_login_register_phone]').prop("checked", false);
            $mo('input[name=mo_customer_validation_wp_login_allow_phone_login]').prop("checked", false);
            $mo('input[name=mo_customer_validation_wp_login_restrict_duplicates]').prop("checked", false);
            $mo('input[name=mo_customer_validation_wp_login_enable_type]').prop("checked", false);
            $mo('input[name=mo_customer_validation_wp_login_bypass_admin]').prop("checked", false);
            $mo('input[name=mo_customer_validation_wp_login_phone_field_key]').val("");
        } else {
            if ($mo('#wp_form_phone').is(':checked')) {
                if ($mo('input[name=mo_customer_validation_wp_login_phone_field_key]').val() == "") {
                    $mo('#error_message').val($mo('#error_message').val() + 'LOGIN_MISSING_KEY');
                    $mo('input[name=mo_customer_validation_wp_login_register_phone]').prop("checked", false);
                    $mo('input[name=mo_customer_validation_wp_login_bypass_admin]').prop("checked", false);
                    $mo('input[name=mo_customer_validation_wp_login_allow_phone_login]').prop("checked", false);
                    $mo('input[name=mo_customer_validation_wp_login_restrict_duplicates]').prop("checked", false);
                    $mo('input[name=mo_customer_validation_wp_login_enable_type]').prop("checked", false);
                    $mo("#wp_login").prop("checked", false);
                }
            } else if (!$mo('input[name=mo_customer_validation_wp_login_enable_type]').is(':checked')) {
                $mo('#error_message').val($mo('#error_message').val() + 'WP_LOGIN_CHOOSE');
                $mo("#wp_login").prop("checked", false);
            }
        }

        // WP eMember
        if (!$mo("#emember_reg").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_emember_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_emember_enable_type]').prop("checked", false);
            }
        } else {
            if (!$mo('input[name=mo_customer_validation_emember_enable_type]').is(':checked')) {
                $mo('#error_message').val($mo('#error_message').val() + 'WPEMEMBER_CHOOSE');
                $mo("#emember_reg").prop("checked", false);
            }
        }

        // FormCraft Basic
        if (!$mo("#formcraft").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_formcraft_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_formcraft_enable_type]').prop("checked", false);
            }
            $mo('input[name^=formcraft_form]').each(function () {
                $mo(this).val('');
            });
        } else {
            if (!$mo('input[name=mo_customer_validation_formcraft_enable_type]').is(':checked')) {
                $mo("#formcraft").prop("checked", false);
                $mo('#error_message').val($mo('#error_message').val() + 'FORMCRAFT_CHOOSE');
            } else {
                let hasEmptyFields = false;
                if ($mo("#formcraft_email").is(':checked')) {
                    $mo("#fce_instructions [id^=formcraft_email_]").each(function () {
                        if ($mo(this).val() == '') {
                            hasEmptyFields = true;
                        }
                        if ($mo(this).prev('input[name^=formcraft_form]').first().val() == '') {
                            hasEmptyFields = true;
                        }
                    });
                }
                if ($mo("#formcraft_phone").is(':checked')) {
                    $mo('#fcp_instructions [id^=formcraft_phone_]').each(function () {
                        if ($mo(this).val() == '') {
                            hasEmptyFields = true;
                        }
                        if ($mo(this).prev('input[name^=formcraft_form]').first().val() == '') {
                            hasEmptyFields = true;
                        }
                    });
                }
                if (hasEmptyFields) {
                    $mo("#formcraft").prop("checked", false);
                    $mo('#error_message').val($mo('#error_message').val() + 'FORMCRAFT_FIELD_ERROR');
                    $mo('input[name=mo_customer_validation_formcraft_enable_type]').prop("checked", false);
                }
            }
        }

        // FormCraft Premium
        if (!$mo("#formcraft_premium").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_fcpremium_enable]').is(':checked')) {
                $mo('input[name=mo_customer_validation_fcpremium_enable]').prop("checked", false);
            }
            $mo('input[name^=fcpremium_form]').each(function () {
                $mo(this).val('');
            });
        } else {
            if (!$mo('input[name=mo_customer_validation_fcpremium_enable]').is(':checked')) {
                $mo("#formcraft_premium").prop("checked", false);
                $mo('#error_message').val($mo('#error_message').val() + 'FORMCRAFT_CHOOSE');
            } else {
                let hasEmptyFields = false;
                if ($mo("#fcpremium_email").is(':checked')) {
                    $mo("#fce_instructions [id^=fcpremium_email_]").each(function () {
                        if ($mo(this).val() == '') {
                            hasEmptyFields = true;
                        }
                        if ($mo(this).prev('input[name^=fcpremium_form]').first().val() == '') {
                            hasEmptyFields = true;
                        }
                    });
                }
                if ($mo("#fcpremium_phone").is(':checked')) {
                    $mo('#fcp_instructions [id^=fcpremium_phone_]').each(function () {
                        if ($mo(this).val() == '') {
                            hasEmptyFields = true;
                        }
                        if ($mo(this).prev('input[name^=fcpremium_form]').first().val() == '') {
                            hasEmptyFields = true;
                        }
                    });
                }
                if (hasEmptyFields) {
                    $mo("#formcraft_premium").prop("checked", false);
                    $mo('#error_message').val($mo('#error_message').val() + 'FORMCRAFT_FIELD_ERROR');
                    $mo('input[name=mo_customer_validation_fcpremium_enable]').prop("checked", false);
                }
            }
        }

        // WP Comment
        if (!$mo("#wpcomment").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_wpcomment_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_wpcomment_enable_type]').prop("checked", false);
            }
        } else {
            if (!$mo('input[name=mo_customer_validation_wpcomment_enable_type]').is(':checked')) {
                $mo('#error_message').val($mo('#error_message').val() + 'WPCOMMENT_CHOOSE');
                $mo("#wpcomment").prop("checked", false);
            }
        }

        // DocDirect
        if (!$mo("#docdirect_default").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_docdirect_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_docdirect_enable_type]').prop("checked", false);
            }
        } else {
            if (!$mo('input[name=mo_customer_validation_docdirect_enable_type]').is(':checked')) {
                $mo('#error_message').val($mo('#error_message').val() + 'DOC_DIRECT_CHOOSE');
                $mo("#docdirect_default").prop("checked", false);
            }
        }

        // WPForms
        if (!$mo("#wpform_basic").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_wpform_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_wpform_enable_type]').prop("checked", false);
            }
            $mo('input[name^="wpform_form"]').each(function () {
                $mo(this).val('');
            });
        } else {
            if (!$mo('input[name=mo_customer_validation_wpform_enable_type]').is(':checked')) {
                $mo("#wpform_basic").prop("checked", false);
                $mo('#error_message').val($mo('#error_message').val() + 'WPFORM_CHOOSE');
            } else {
                let hasEmptyFields = false;
                if ($mo("#wp_form_email").is(':checked')) {
                    $mo("#wpform_email_option [id^=wp_form_email_]").each(function () {
                        if ($mo(this).val() == '') {
                            hasEmptyFields = true;
                        }
                        if ($mo(this).prev('input[name^=wpform_form]').first().val() == '') {
                            hasEmptyFields = true;
                        }
                    });
                }
                if ($mo("#wp_form_phone").is(':checked')) {
                    $mo('#wp_form_phone [id^=wp_form_phone_]').each(function () {
                        if ($mo(this).val() == '') {
                            hasEmptyFields = true;
                        }
                        if ($mo(this).prev('input[name^=wpform_form]').first().val() == '') {
                            hasEmptyFields = true;
                        }
                    });
                }
                if (hasEmptyFields) {
                    $mo("#wpform_basic").prop("checked", false);
                    $mo('#error_message').val($mo('#error_message').val() + 'WPFORM_FIELD_ERROR');
                    $mo('input[name=mo_customer_validation_wpform_enable]').prop("checked", false);
                }
            }
        }

        // Caldera forms
        if (!$mo("#caldera_basic").is(':checked')) {
            if ($mo('input[name=mo_customer_validation_caldera_enable_type]').is(':checked')) {
                $mo('input[name=mo_customer_validation_caldera_enable_type]').prop("checked", false);
            }
            $mo('input[name^="caldera_form"]').each(function () {
                $mo(this).val('');
            });
        } else {
            if (!$mo('input[name=mo_customer_validation_caldera_enable_type]').is(':checked')) {
                $mo("#caldera_basic").prop("checked", false);
                $mo('#error_message').val($mo('#error_message').val() + 'WPFORM_CHOOSE');
            } else {
                let hasEmptyFields = false;
                if ($mo("#caldera_form_email").is(':checked')) {
                    $mo("#caldera_email_option [id^=caldera_form_email_]").each(function () {
                        if ($mo(this).val() == '') {
                            hasEmptyFields = true;
                        }
                        if ($mo(this).prev('input[name^=caldera_form]').first().val() == '') {
                            hasEmptyFields = true;
                        }
                    });
                }
                if ($mo("#caldera_form_phone").is(':checked')) {
                    $mo('#caldera_form_phone [id^=caldera_form_phone_]').each(function () {
                        if ($mo(this).val() == '') {
                            hasEmptyFields = true;
                        }
                        if ($mo(this).prev('input[name^=caldera_form]').first().val() == '') {
                            hasEmptyFields = true;
                        }
                    });
                }
                if (hasEmptyFields) {
                    $mo("#caldera_basic").prop("checked", false);
                    $mo('#error_message').val($mo('#error_message').val() + 'CALDERA_FIELD_ERROR');
                    $mo('input[name=mo_customer_validation_caldera_enable]').prop("checked", false);
                }
            }
        }

        // Submit the correct form based on which form the button belongs to
        const $form = $mo(this).closest('form');
        if ($form.length > 0) {
            $form.trigger('submit');
        } else {
            // Fallback to default form if form not found
            $mo("#mo_otp_verification_settings").trigger('submit');
        }
        $btn.prop('disabled', false);
    });
});

