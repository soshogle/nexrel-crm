<?php
/**
 * OTP Spam Preventer View
 *
 * @package otpspampreventer/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?>

<div class="mo-osp-container">
	<form method="post" action="" id="mo_osp_settings_form">
		<?php wp_nonce_field( 'mo_osp_settings_save' ); ?>
		<input type="hidden" name="option" value="mo_osp_settings_save" />

		<div class="mo-header">
			<p class="mo-heading flex-1">
				<?php echo esc_html( __( 'OTP Spam Protection', 'miniorange-otp-verification' ) ); ?>
			</p>
			<input type="submit" name="save" id="save" class="mo-button inverted" value="<?php echo esc_attr( __( 'Save Settings', 'miniorange-otp-verification' ) ); ?>">
		</div>

		<div class="mo-osp-card">
			<div class="mo-osp-card-header">
				<h3 class="mo-osp-section-title">
					<svg class="mo-osp-section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 4L13.5 7H7V9H13.5L15 12L21 9ZM4 15.5C4 17.43 5.57 19 7.5 19S11 17.43 11 15.5 9.43 12 7.5 12 4 13.57 4 15.5ZM7.5 17C6.67 17 6 16.33 6 15.5S6.67 14 7.5 14 9 14.67 9 15.5 8.33 17 7.5 17Z" fill="currentColor"/>
					</svg>
					<?php echo esc_html( __( 'Basic Protection Settings', 'miniorange-otp-verification' ) ); ?>
				</h3>
				<p class="mo-osp-section-desc"><?php echo esc_html( __( 'Configure how long users must wait between OTP requests and how many attempts are allowed.', 'miniorange-otp-verification' ) ); ?></p>
			</div>

			<div class="mo-osp-card-body">
				<div class="mo-osp-fields-grid">
					<div class="mo-osp-field-group">
						<div class="mo-input-wrapper group">
							<label class="mo-input-label">
								<svg class="mo-osp-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2ZM17 13H11V7H12.5V11.5H17V13Z" fill="currentColor"/>
								</svg>
								<?php echo esc_html( __( 'Wait Time Between Requests', 'miniorange-otp-verification' ) ); ?>
							</label>
							<input type="number" id="mo_osp_cooldown_time" name="mo_osp_cooldown_time" value="<?php echo esc_attr( $settings['cooldown_time'] ); ?>" min="0" max="86400" class="mo-form-input w-full" />
						</div>
						<p class="mo-osp-field-desc"><?php echo esc_html( __( 'Seconds users must wait before requesting another OTP (e.g., 60 = 1 minute).', 'miniorange-otp-verification' ) ); ?></p>
					</div>

					<div class="mo-osp-field-group">
						<div class="mo-input-wrapper group">
							<label class="mo-input-label">
								<svg class="mo-osp-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M12 2C10.1 2 8.5 3.6 8.5 5.5S10.1 9 12 9 15.5 7.4 15.5 5.5 13.9 2 12 2ZM12 7C11.2 7 10.5 6.3 10.5 5.5S11.2 4 12 4 13.5 4.7 13.5 5.5 12.8 7 12 7ZM5.5 8C3.6 8 2 9.6 2 11.5S3.6 15 5.5 15 9 13.4 9 11.5 7.4 8 5.5 8ZM18.5 8C16.6 8 15 9.6 15 11.5S16.6 15 18.5 15 22 13.4 22 11.5 20.4 8 18.5 8ZM12 10.5C10.1 10.5 8.5 12.1 8.5 14S10.1 17.5 12 17.5 15.5 15.9 15.5 14 13.9 10.5 12 10.5ZM5.5 16C3.6 16 2 17.6 2 19.5S3.6 23 5.5 23 9 21.4 9 19.5 7.4 16 5.5 16ZM18.5 16C16.6 16 15 17.6 15 19.5S16.6 23 18.5 23 22 21.4 22 19.5 20.4 16 18.5 16Z" fill="currentColor"/>
								</svg>
								<?php echo esc_html( __( 'Maximum Attempts Allowed', 'miniorange-otp-verification' ) ); ?>
							</label>
							<input type="number" id="mo_osp_max_attempts" name="mo_osp_max_attempts" value="<?php echo esc_attr( $settings['max_attempts'] ); ?>" min="3" max="10" class="mo-form-input w-full" />
						</div>
						<p class="mo-osp-field-desc"><?php echo esc_html( __( 'How many OTP requests are allowed before blocking (between 1-10).', 'miniorange-otp-verification' ) ); ?></p>
					</div>

					<div class="mo-osp-field-group">
						<div class="mo-input-wrapper group">
							<label class="mo-input-label">
								<svg class="mo-osp-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M18 8H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15S10.9 13 12 13 14 13.9 14 15 13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9S15.1 4.29 15.1 6V8Z" fill="currentColor"/>
								</svg>
								<?php echo esc_html( __( 'Block Duration', 'miniorange-otp-verification' ) ); ?>
							</label>
							<input type="number" id="mo_osp_block_time" name="mo_osp_block_time" value="<?php echo esc_attr( $settings['block_time'] ); ?>" min="60" max="604800" class="mo-form-input w-full" />
						</div>
						<p class="mo-osp-field-desc"><?php echo esc_html( __( 'How long to block users after too many attempts in seconds (3600 = 1 hour).', 'miniorange-otp-verification' ) ); ?></p>
					</div>
				</div>
			</div>
		</div>

		<div class="mo-osp-card">
			<button type="button" id="mo-osp-toggle-advanced" class="mo-osp-toggle-btn">
				<div class="mo-osp-toggle-content">
					<h3 class="mo-osp-section-title">
						<svg class="mo-osp-section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5A3.5 3.5 0 0 1 15.5 12A3.5 3.5 0 0 1 12 15.5M19.43 12.98C19.47 12.66 19.5 12.34 19.5 12S19.47 11.34 19.43 11.02L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.97 19.05 5.05L16.56 6.05C16.04 5.65 15.48 5.32 14.87 5.07L14.49 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.51 2.42L9.13 5.07C8.52 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.72 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11.02C4.53 11.34 4.5 11.67 4.5 12S4.53 12.66 4.57 12.98L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.73 19.03 4.95 18.95L7.44 17.95C7.96 18.35 8.52 18.68 9.13 18.93L9.51 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.49 21.58L14.87 18.93C15.48 18.68 16.04 18.34 16.56 17.95L19.05 18.95C19.28 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98Z" fill="currentColor"/>
						</svg>
						<?php echo esc_html( __( 'Advanced Settings', 'miniorange-otp-verification' ) ); ?>
					</h3>
					<div class="mo-osp-toggle-indicator">
						<span id="mo-osp-toggle-text" class="mo-osp-toggle-text"><?php echo esc_html( __( 'Show Advanced', 'miniorange-otp-verification' ) ); ?></span>
						<span id="mo-osp-toggle-icon" class="mo-osp-toggle-icon">▼</span>
					</div>
				</div>
			</button>

			<div id="mo-osp-advanced-settings" class="mo-osp-advanced-hidden">
				<div class="mo-osp-advanced-content">
					<div class="mo-osp-subsection">
						<div class="mo-osp-subsection-header">
							<h4 class="mo-osp-subsection-title">
								<svg class="mo-osp-subsection-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M11.99 2C6.47 2 2 6.48 2 12S6.47 22 11.99 22C17.52 22 22 17.52 22 12S17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12S7.58 4 12 4S20 7.58 20 12S16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="currentColor"/>
								</svg>
								<?php echo esc_html( __( 'Daily & Hourly Limits', 'miniorange-otp-verification' ) ); ?>
							</h4>
							<p class="mo-osp-section-desc"><?php echo esc_html( __( 'Set maximum OTP requests per user per day and per hour to prevent abuse.', 'miniorange-otp-verification' ) ); ?></p>
						</div>

						<div class="mo-osp-fields-grid">
							<div class="mo-osp-field-group">
								<div class="mo-input-wrapper group">
									<label class="mo-input-label">
										<svg class="mo-osp-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3.01 3.9 3.01 5L3 19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19ZM7 10H12V15H7V10Z" fill="currentColor"/>
										</svg>
										<?php echo esc_html( __( 'Daily Limit Per User', 'miniorange-otp-verification' ) ); ?>
									</label>
									<input type="number" id="mo_osp_daily_limit" name="mo_osp_daily_limit" value="<?php echo esc_attr( $settings['daily_limit'] ); ?>" min="1" max="1000" class="mo-form-input w-full" />
								</div>
								<p class="mo-osp-field-desc"><?php echo esc_html( __( 'Maximum OTP requests one user can make in a single day.', 'miniorange-otp-verification' ) ); ?></p>
							</div>

							<div class="mo-osp-field-group">
								<div class="mo-input-wrapper group">
									<label class="mo-input-label">
										<svg class="mo-osp-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M11.99 2C6.47 2 2 6.48 2 12S6.47 22 11.99 22C17.52 22 22 17.52 22 12S17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12S7.58 4 12 4S20 7.58 20 12S16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="currentColor"/>
										</svg>
										<?php echo esc_html( __( 'Hourly Limit Per User', 'miniorange-otp-verification' ) ); ?>
									</label>
									<input type="number" id="mo_osp_hourly_limit" name="mo_osp_hourly_limit" value="<?php echo esc_attr( $settings['hourly_limit'] ); ?>" min="1" max="100" class="mo-form-input w-full" />
								</div>
								<p class="mo-osp-field-desc"><?php echo esc_html( __( 'Maximum OTP requests one user can make in a single hour.', 'miniorange-otp-verification' ) ); ?></p>
							</div>
						</div>
					</div>

					<div class="mo-osp-subsection">
						<div class="mo-osp-subsection-header">
							<h4 class="mo-osp-subsection-title">
								<svg class="mo-osp-subsection-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M12 2C13.5 2 15 2.19 16.43 2.56L15.65 4.93C14.46 4.33 13.24 4 12 4C8.27 4 4.94 5.66 3 8.5C4.94 11.34 8.27 13 12 13S19.06 11.34 21 8.5C20.72 7.93 20.39 7.4 20.03 6.93L21.42 5.54C22.41 6.69 23.06 7.79 23.06 8.5C23.06 9.21 22.41 10.31 21.42 11.46C19.94 13.34 16.06 15 12 15S4.06 13.34 2.58 11.46C1.59 10.31 0.94 9.21 0.94 8.5C0.94 7.79 1.59 6.69 2.58 5.54C4.06 3.66 7.94 2 12 2ZM12 6.5C13.38 6.5 14.5 7.62 14.5 9S13.38 11.5 12 11.5 9.5 10.38 9.5 9 10.62 6.5 12 6.5ZM18.5 1L17 2.5L18.5 4L20 2.5L18.5 1Z" fill="currentColor"/>
								</svg>
								<?php echo esc_html( __( 'Trusted IP Addresses', 'miniorange-otp-verification' ) ); ?>
							</h4>
							<p class="mo-osp-section-desc"><?php echo esc_html( __( 'IP addresses that should never be blocked, even if they exceed limits.', 'miniorange-otp-verification' ) ); ?></p>
						</div>

						<div class="mo-osp-field-group mo-osp-field-full">
							<div class="mo-input-wrapper group">
								<label class="mo-input-label">
									<svg class="mo-osp-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M4.93 4.93L3.51 6.34C2.52 7.33 2 8.61 2 10S2.52 12.67 3.51 13.66L6.34 16.49C7.33 17.48 8.61 18 10 18S12.67 17.48 13.66 16.49L16.49 13.66C17.48 12.67 18 11.39 18 10S17.48 7.33 16.49 6.34L13.66 3.51C12.67 2.52 11.39 2 10 2S7.33 2.52 6.34 3.51L4.93 4.93ZM15.07 9.07L13.66 10.49L12.24 9.07L10.83 10.49L12.24 11.9L10.83 13.32L12.24 14.73L13.66 13.32L15.07 14.73L16.49 13.32L15.07 11.9L16.49 10.49L15.07 9.07ZM8.41 8.41L9.83 7L11.24 8.41L12.66 7L14.07 8.41L12.66 9.83L11.24 8.41L9.83 9.83L8.41 8.41Z" fill="currentColor"/>
									</svg>
									<?php echo esc_html( __( 'Whitelist IP Addresses', 'miniorange-otp-verification' ) ); ?>
								</label>
								<textarea id="mo_osp_whitelist_ips" name="mo_osp_whitelist_ips" rows="6" class="mo-form-textarea w-full">
								<?php
									$whitelist_display = isset( $settings['whitelist_ips'] ) && is_array( $settings['whitelist_ips'] )
										? $settings['whitelist_ips']
										: ( is_string( $settings['whitelist_ips'] )
											? array_filter( array_map( 'trim', explode( "\n", $settings['whitelist_ips'] ) ) )
											: array() );
									echo esc_textarea( implode( "\n", $whitelist_display ) );
									?>
								</textarea>
							</div>
							<p class="mo-osp-field-desc"><?php echo esc_html( __( 'Enter one IP address per line (e.g., 192.168.1.1). These IPs will bypass all protection.', 'miniorange-otp-verification' ) ); ?></p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</form>
</div>
