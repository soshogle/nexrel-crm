<?php
/**
 * Core Onboard.
 *
 * @package iconic-core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Core_Onboard.
 *
 * @class    Iconic_WooThumbs_Core_Onboard
 * @version  1.0.0
 */
class Iconic_WooThumbs_Core_Onboard {
	/**
	 * Run on `plugins_loaded`.
	 */
	public static function run() {
		if ( ! is_admin() || ! class_exists( 'Iconic_WooThumbs_Core_Cross_Sells' ) || ! Iconic_WooThumbs_Core_Settings::is_settings_page() ) {
			return;
		}

		if ( self::get_started_is_dismissed() ) {
			add_filter( 'wpsf_before_settings_fields_' . Iconic_WooThumbs_Core_Settings::$args['option_group'], array( __CLASS__, 'add_hidden_field' ), 20 );
		} else {
			add_filter( 'wpsf_register_settings_' . Iconic_WooThumbs_Core_Settings::$args['option_group'], array( __CLASS__, 'add_settings' ), 20 );
			add_action( 'admin_head', array( __CLASS__, 'add_inline_assets' ), 100 );
			add_action( 'admin_footer', array( __CLASS__, 'add_dismiss_modal' ) );
		}
	}

	/**
	 * Once Get Started is dismissed, we need to make sure that setting
	 * is saved along with the settings.
	 */
	public static function add_hidden_field() {
		?>
		<input type="hidden" name="<?php echo esc_attr( Iconic_WooThumbs_Core_Settings::$args['option_group'] ); ?>_settings[hide_get_started]" value="1">
		<?php
	}

	/**
	 * Add settings tab.
	 *
	 * @param array $settings Plugin settings.
	 */
	public static function add_settings( $settings ) {
		$steps = self::get_onboard_steps();

		if ( empty( $steps ) ) {
			return $settings;
		}

		$tab = array(
			'id'    => 'iconic-onboard',
			'title' => sprintf( '%s <span class="iconic-onboard-dismiss dashicons dashicons-no-alt"></span>', esc_html__( 'Get Started', 'iconic-woothumbs' ) ),
		);

		array_unshift( $settings['tabs'], $tab );

		// Dashboard.
		$settings['sections']['iconic-onboard'] = array(
			'tab_id'              => 'iconic-onboard',
			'section_id'          => 'steps',
			'section_title'       => esc_html__( 'Get Started', 'iconic-woothumbs' ),
			'section_description' => '',
			'section_order'       => 0,
			'fields'              => array(
				array(
					'id'     => 'display',
					'title'  => esc_html__( 'Steps', 'iconic-woothumbs' ),
					'type'   => 'custom',
					'output' => self::get_onboard_steps_display(),
				),
			),
		);

		return $settings;
	}


	/**
	 * Get plugin slug.
	 *
	 * @return string
	 */
	public static function get_plugin_slug() {
		return str_replace( '-', '_', 'iconic-woothumbs' );
	}

	/**
	 * Add onboard assets.
	 */
	public static function add_inline_assets() {
		?>
		<style>
			.wpsf-nav__item-link[href="#tab-iconic-onboard"] {
				position: relative;
				padding-right: 26px;
			}

			.iconic-onboard-dismiss {
				display: inline-block;
				background: #EAEAEA;
				height: 18px;
				width: 18px;
				border-radius: 10px;
				line-height: 18px;
				text-align: center;
				position: absolute;
				top: 50%;
				right: 0;
				margin: -8px 0 0;
				color: #3B434A;
				overflow: hidden;
				font-weight: normal;
				font-size: 16px;
			}

			.wpsf-tab--iconic-onboard .postbox h2 {
				margin-bottom: 0;
			}

			.wpsf-tab--iconic-onboard .postbox table.form-table {
				margin: 0;
				width: 100%;
			}

			.wpsf-tab--iconic-onboard .postbox table.form-table th {
				display: none;
			}

			.wpsf-tab--iconic-onboard .postbox table.form-table td {
				padding: 0;
			}

			.iconic-onboard-steps {
				counter-reset: iconic-onboard-steps;
				margin: 0;
				padding: 0;
				list-style: none none outside;
			}

			.iconic-onboard-steps__step {
				border-top: 1px solid #F0F0F1;
				margin: 0;
				padding: 15px 15px 15px 54px;
				position: relative;
				display: flex;
				align-items: center;
				justify-content: space-between;
				cursor: pointer;
			}

			.iconic-onboard-steps__step:first-child {
				border-top: none;
			}

			.iconic-onboard-steps__step:before {
				counter-increment: iconic-onboard-steps;
				content: counter(iconic-onboard-steps);
				color: #3c434a;
				border: 1px solid #3c434a;
				width: 24px;
				height: 24px;
				border-radius: 12px;
				text-align: center;
				line-height: 22px;
				box-sizing: border-box;
				display: inline-block;
				position: absolute;
				top: 50%;
				margin: -12px 0 0;
				left: 15px;
				font-size: 12px;
			}

			.iconic-onboard-steps__step--active:before {
				border-color: #5558DA;
				background: #5558DA;
				color: #fff;
			}

			.form-table td h4.iconic-onboard-steps__step-title {
				margin: 0 0 2px;
			}

			.form-table td p.iconic-onboard-steps__step-description {
				margin: 0;
			}

			.iconic-onboard-steps__step-link {
				color: #5558DA;
				text-decoration: none;
				display: inline-block;
				height: 30px;
				line-height: 30px;
				padding: 0 10px;
				white-space: nowrap;
				margin: 0 0 0 15px;
				transition: none;
				border-radius: 3px;
				background: none;
				border: none;
				cursor: pointer;
			}

			.iconic-onboard-steps__step--hover .iconic-onboard-steps__step-link,
			.iconic-onboard-steps__step-link:hover {
				background: #5558DA;
				color: #fff;
			}

			.iconic-onboard-steps__step-link .dashicons {
				font-size: 12px;
				vertical-align: middle;
				border: 1px solid;
				width: 20px;
				height: 20px;
				line-height: 18px;
				border-radius: 10px;
				box-sizing: border-box;
				margin: -2px 0 0 4px;
				transition: transform 150ms ease-in-out;
			}

			.iconic-onboard-steps__step--active .iconic-onboard-steps__step-link .dashicons {
				transform: rotate(90deg);
			}

			.iconic-onboard-steps__step-body {
				margin: 0;
				padding: 0;
				display: none;
			}

			.iconic-onboard-steps__step-body-padding {
				padding: 15px 30px 30px 54px;
				max-width: 800px;
			}

			.iconic-onboard-steps__step-body p {
				margin: 0 0 12px !important;
			}

			.iconic-onboard-steps__step-body p:last-child {
				margin-bottom: 0 !important;
			}

			.iconic-onboard-steps__step-body img {
				height: auto;
				margin: 12px 0 24px 0 !important;
				max-width: 800px;
				width: 100%;
				border-radius: 8px;
				box-shadow: 0 1px 1px rgba(0, 0, 0, 0.04);
			}

			.iconic-onboard-iframe {
				overflow: hidden;
				/* 16:9 aspect ratio */
				padding-top: 56.25%;
				position: relative;
				display: block;
				margin: 24px 0;
			}

			p:first-child .iconic-onboard-iframe {
				margin-top: 0;
			}

			p:last-child .iconic-onboard-iframe {
				margin-bottom: 0;
			}

			.iconic-onboard-iframe--ended:after {
				content: "";
				position: absolute;
				top: 0;
				left: 0;
				bottom: 0;
				right: 0;
				cursor: pointer;
				background-color: #101014;
				background-repeat: no-repeat;
				background-position: center;
				background-size: 64px 64px;
				background-image: url("data:image/svg+xml;utf8;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgNTEwIDUxMCI+PHBhdGggZD0iTTI1NSAxMDJWMEwxMjcuNSAxMjcuNSAyNTUgMjU1VjE1M2M4NC4xNSAwIDE1MyA2OC44NSAxNTMgMTUzcy02OC44NSAxNTMtMTUzIDE1My0xNTMtNjguODUtMTUzLTE1M0g1MWMwIDExMi4yIDkxLjggMjA0IDIwNCAyMDRzMjA0LTkxLjggMjA0LTIwNC05MS44LTIwNC0yMDQtMjA0eiIgZmlsbD0iI0ZGRiIvPjwvc3ZnPg==");
			}

			.iconic-onboard-iframe iframe {
				border: 0;
				height: 100%;
				left: 0;
				position: absolute;
				top: 0;
				width: 100%;
			}

			.iconic-onboard-dismiss-modal-overlay {
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: #000;
				z-index: 99999;
				opacity: 0.6;
				display: none;
			}

			.iconic-onboard-dismiss-modal {
				position: fixed;
				background: #fff;
				z-index: 100000;
				width: 100%;
				max-width: 400px;
				border-radius: 8px;
				padding: 30px;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				display: none;
				box-sizing: border-box;
				width: calc(100% - 40px);
			}

			.iconic-onboard-dismiss-modal :first-child {
				margin-top: 0 !important;
			}

			.iconic-onboard-dismiss-modal :last-child {
				margin-bottom: 0 !important;
			}

			.iconic-onboard-dismiss-modal__actions {
				margin-top: 2.5em;
			}

			.iconic-onboard-dismiss-modal .button-primary {
				margin-right: 10px;
			}

			.iconic-onboard-steps__step-actions--install-plugin {
				margin-top: 8px !important;
			}
		</style>
		<script>
			(function( $, document ) {
				var iconic_onboard = {
					/**
					 * On ready.
					 */
					on_ready: function() {
						iconic_onboard.steps.watch();
						iconic_onboard.dismiss.watch();
						iconic_onboard.replay_overlay();
					},

					/**
					 * Steps.
					 */
					steps: {
						/**
						 * Watch events on steps.
						 */
						watch: function() {
							$( document ).on( 'mouseenter mouseleave', '.iconic-onboard-steps__step', function( e ) {
								var $step = $( this ),
									hover_class = 'iconic-onboard-steps__step--hover';

								if ( 'mouseenter' === e.type ) {
									$step.addClass( hover_class );
								} else {
									$step.removeClass( hover_class );
								}
							} );

							$( document ).on( 'click', '.iconic-onboard-steps__step', function( e ) {
								if ( e.target.classList.contains( 'iconic-onboard-steps__step-actions--install-plugin' ) ) {
									return;
								}

								e.preventDefault();

								var $step = $( this );

								iconic_onboard.steps.toggle( $step );
							} );
						},

						/**
						 * Toggle step.
						 */
						toggle: function( $step ) {
							var $link = $step.find( '.iconic-onboard-steps__step-link' );

							if ( $link.is( 'a' ) ) {
								window.open( $link.attr( 'href' ), '_blank' );
								return;
							}

							var active_step_class = 'iconic-onboard-steps__step--active',
								open_body_class = 'iconic-onboard-steps__step-body--open',
								is_active = $step.hasClass( active_step_class ),
								$step_body = $step.next( '.iconic-onboard-steps__step-body' );

							$( '.' + active_step_class ).removeClass( active_step_class );
							$( '.' + open_body_class ).slideUp( 150 );

							if ( !is_active ) {
								$step.addClass( active_step_class );
								$step_body.addClass( open_body_class ).slideDown( 150 );
							}
						},
					},

					/**
					 * Dismiss.
					 */
					dismiss: {
						/**
						 * Watch dismiss button.
						 */
						watch: function() {
							$( document ).on( 'click', '.iconic-onboard-dismiss', function() {
								iconic_onboard.dismiss.show_modal();
							} );

							$( document ).on( 'click', '.iconic-onboard-dismiss-modal__cancel, .iconic-onboard-dismiss-modal-overlay', function() {
								iconic_onboard.dismiss.hide_modal();
							} );

							$( document ).on( 'click', '.iconic-onboard-dismiss-modal__dismiss', function() {
								$( '.iconic-onboard-hide-get-started' ).val( 1 );
								$( '.wpsf-settings form' ).first().submit();
							} );
						},

						/**
						 * Show dismiss modal.
						 */
						show_modal: function() {
							$( '.iconic-onboard-dismiss-modal-overlay' ).show();
							$( '.iconic-onboard-dismiss-modal' ).show();
						},

						/**
						 * Hide dismiss modal.
						 */
						hide_modal: function() {
							$( '.iconic-onboard-dismiss-modal-overlay' ).hide();
							$( '.iconic-onboard-dismiss-modal' ).hide();
						}
					},

					/**
					 * Video overlay.
					 */
					replay_overlay: function() {
						// Activate only if not already activated
						if ( window.hideYTActivated ) {
							return;
						}

						// Load API
						if ( typeof YT === 'undefined' ) {
							let tag = document.createElement( 'script' );
							tag.src = "https://www.youtube.com/iframe_api";
							let firstScriptTag = document.getElementsByTagName( 'script' )[ 0 ];
							firstScriptTag.parentNode.insertBefore( tag, firstScriptTag );
						}

						// Activate on all players
						let onYouTubeIframeAPIReadyCallbacks = [];

						for ( let playerWrap of document.querySelectorAll( ".iconic-onboard-iframe" ) ) {
							let playerFrame = playerWrap.querySelector( "iframe" );

							let onPlayerStateChange = function( event ) {
								if ( event.data === YT.PlayerState.ENDED ) {
									playerWrap.classList.add( "iconic-onboard-iframe--ended" );
								} else if ( event.data === YT.PlayerState.PAUSED ) {
									playerWrap.classList.add( "iconic-onboard-iframe--paused" );
								} else if ( event.data === YT.PlayerState.PLAYING ) {
									playerWrap.classList.remove( "iconic-onboard-iframe--paused" );
									playerWrap.classList.remove( "iconic-onboard-iframe--ended" );
								}
							};

							let player;

							onYouTubeIframeAPIReadyCallbacks.push( function() {
								player = new YT.Player( playerFrame, {
									events: {
										'onStateChange': onPlayerStateChange
									}
								} );
							} );

							playerWrap.addEventListener( "click", function() {
								let playerState = player.getPlayerState();
								if ( playerState === YT.PlayerState.ENDED ) {
									player.seekTo( 0 );
								} else if ( playerState === YT.PlayerState.PAUSED ) {
									player.playVideo();
								}
							} );
						}

						window.onYouTubeIframeAPIReady = function() {
							for ( let callback of onYouTubeIframeAPIReadyCallbacks ) {
								callback();
							}
						};

						window.hideYTActivated = true;
					}
				};

				$( document ).ready( iconic_onboard.on_ready );

			}( jQuery, document ));
		</script>
		<?php
	}

	/**
	 * Add dismiss modal.
	 */
	public static function add_dismiss_modal() {
		?>
		<div class="iconic-onboard-dismiss-modal-overlay"></div>
		<div class="iconic-onboard-dismiss-modal">
			<h3><?php echo wp_kses_post( esc_html__( 'Are you sure?', 'iconic-woothumbs' ) ); ?></h3>
			<p><?php echo wp_kses_post( esc_html__( "Are you sure you want to dismiss the Get Started tab? You won't be able to access it again.", 'iconic-woothumbs' ) ); ?></p>
			<div class="iconic-onboard-dismiss-modal__actions">
				<button class="iconic-onboard-dismiss-modal__dismiss button-primary"><?php esc_attr_e( 'Yes', 'iconic-woothumbs' ); ?></button>
				<button class="iconic-onboard-dismiss-modal__cancel button-link"><?php esc_attr_e( 'Cancel', 'iconic-woothumbs' ); ?></button>
			</div>
		</div>
		<?php
	}

	/**
	 * Get onboard steps.
	 */
	public static function get_onboard_steps() {
		static $steps = false;

		if ( ! empty( $steps ) ) {
			return apply_filters( self::get_plugin_slug() . '_core_onboard_steps', $steps );
		}

		$plugin = Iconic_WooThumbs_Core_Cross_Sells::get_plugin();

		if ( empty( $plugin ) || empty( $plugin['product']['onboarding_steps'] ) ) {
			return false;
		}

		$steps = $plugin['product']['onboarding_steps'];

		return apply_filters( self::get_plugin_slug() . '_core_onboard_steps', $steps );
	}

	/**
	 * Is "Get Started" dismissed?
	 *
	 * @return bool
	 */
	public static function get_started_is_dismissed() {
		$settings = get_option( Iconic_WooThumbs_Core_Settings::$args['option_group'] . '_settings', array() );

		return ! empty( $settings['hide_get_started'] );
	}

	/**
	 * Get onboard steps display.
	 */
	public static function get_onboard_steps_display() {
		$steps = self::get_onboard_steps();

		if ( empty( $steps ) ) {
			return false;
		}

		ob_start();
		?>
		<input type="hidden" class="iconic-onboard-hide-get-started" name="<?php echo esc_attr( Iconic_WooThumbs_Core_Settings::$args['option_group'] ); ?>_settings[hide_get_started]" value="0">
		<ul class="iconic-onboard-steps">
			<?php
			foreach ( $steps as $step ) {
				?>
				<li class="iconic-onboard-steps__step">
					<div class="iconic-onboard-steps__step-content">
						<h4 class="iconic-onboard-steps__step-title"><?php echo wp_kses_post( $step['title'] ); ?></h4>
						<p class="iconic-onboard-steps__step-description"><?php echo wp_kses_post( $step['description'] ); ?></p>

						<?php if ( ! empty( $step['install_plugin'] ) && ! empty( $step['install_plugin']['installer'] ) ) { ?>
							<?php self::output_install_plugin_btn( $step['install_plugin'] ); ?>
						<?php } ?>
					</div>
					<div class="iconic-onboard-steps__step-actions">

						<?php if ( 'link' === $step['type'] ) { ?>
							<a href="<?php echo esc_attr( $step['link'] ); ?>" class="iconic-onboard-steps__step-link"><?php echo wp_kses_post( $step['button_text'] ); ?> <span class="dashicons dashicons-external"></span></a>
						<?php } else { ?>
							<span class="iconic-onboard-steps__step-link"><?php echo wp_kses_post( $step['button_text'] ); ?> <span class="dashicons dashicons-arrow-right-alt"></span></span>
						<?php } ?>
					</div>
				</li>
				<?php if ( 'content' === $step['type'] && ! empty( $step['content'] ) ) { ?>
					<li class="iconic-onboard-steps__step-body">
						<div class="iconic-onboard-steps__step-body-padding">
							<?php add_filter( 'wp_kses_allowed_html', array( __CLASS__, 'allow_iframe' ), 10 ); ?>
							<?php echo wp_kses_post( $step['content'] ); ?>
							<?php remove_filter( 'wp_kses_allowed_html', array( __CLASS__, 'allow_iframe' ), 10 ); ?>
						</div>
					</li>
				<?php } ?>
			<?php } ?>
			<li class="iconic-onboard-steps__step">
				<div class="iconic-onboard-steps__step-content">
					<h4 class="iconic-onboard-steps__step-title"><?php echo wp_kses_post( esc_html__( 'Priority Support', 'iconic-woothumbs' ) ); ?></h4>
					<p class="iconic-onboard-steps__step-description"><?php echo wp_kses_post( esc_html__( 'Help is at hand if you face any issues.', 'iconic-woothumbs' ) ); ?></p>
				</div>
				<div class="iconic-onboard-steps__step-actions">
					<a href="https://iconicwp.com/support/?utm_source=Iconic&utm_medium=Plugin&utm_campaign=get-started&utm_content=iconic-woothumbs" class="iconic-onboard-steps__step-link">
						<?php echo wp_kses_post( esc_html__( 'Get Help', 'iconic-woothumbs' ) ); ?> <span class="dashicons dashicons-external"></span>
					</a>
				</div>
			</li>
		</ul>
		<?php

		return ob_get_clean();
	}

	/**
	 * Output step button.
	 *
	 * @param array $install_plugin Install plugin.
	 */
	public static function output_install_plugin_btn( $install_plugin ) {
		if ( empty( $install_plugin['installer'] ) || empty( $install_plugin['installer'] ) ) {
			return;
		}

		$existing_class          = $install_plugin['class'] ?? '';
		$install_plugin['class'] = $existing_class . 'button iconic-onboard-steps__step-actions--install-plugin';

		$install_plugin['installer']->output_button( $install_plugin );
	}

	/**
	 * Temporarily allow iframes.
	 *
	 * @param array $allowed Allowed tags.
	 *
	 * @return array
	 */
	public static function allow_iframe( $allowed ) {
		$allowed['iframe'] = array(
			'align'        => true,
			'width'        => true,
			'height'       => true,
			'frameborder'  => true,
			'name'         => true,
			'src'          => true,
			'id'           => true,
			'class'        => true,
			'style'        => true,
			'scrolling'    => true,
			'marginwidth'  => true,
			'marginheight' => true,
		);

		return $allowed;
	}

	/**
	 * Format iframe in step content.
	 *
	 * @param string $content Rich content.
	 *
	 * @return string|string[]|null
	 */
	public static function format_iframe( $content ) {
		// Add responsive wrapper.
		$content = str_replace( array( '<iframe', '</iframe>' ), array( '<span class="iconic-onboard-iframe"><iframe allow="fullscreen"', '</iframe></span>' ), $content );

		// Enable API - modify YouTube URL.
		$pattern = '/<iframe.*?s*src="(.*?)".*?<\/iframe>/';
		$content = preg_replace_callback(
			$pattern,
			function ( $match ) {
				$url = add_query_arg(
					array(
						'rel'         => 0,
						'enablejsapi' => 1,
					),
					$match[1]
				);

				return str_replace( $match[1], $url, $match[0] );
			},
			$content
		);

		return $content;
	}
}
