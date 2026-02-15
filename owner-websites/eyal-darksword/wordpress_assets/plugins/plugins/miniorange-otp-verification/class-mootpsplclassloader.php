<?php
/**
 * This class loads all the classes.
 *
 * @package miniorange-otp-verification
 */

namespace OTP;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'MoOTPSplClassLoader' ) ) {
	/**
	 * This class loads all the classes.
	 */
	final class MoOTPSplClassLoader {
		/**
		 * File extention.
		 *
		 * @var string
		 */
		private $file_extension = '.php';

		/**
		 * Namespace value for the plugin.
		 *
		 * @var string
		 */
		private $namespace;

		/**
		 * Include path.
		 *
		 * @var string
		 */
		private $include_path;

		/**
		 * Namespace separator.
		 *
		 * @var string
		 */
		private $namespace_separator = '\\';

		/**
		 * Initilaizes values.
		 *
		 * @param string $ns namespace value.
		 * @param string $include_path directory path.
		 */
		public function __construct( $ns = null, $include_path = null ) {
			$this->namespace    = $ns;
			$this->include_path = $include_path;
		}

		/**
		 * Registers the autoload function to handle classes.
		 *
		 * @return void
		 */
		public function register() {
			spl_autoload_register( array( $this, 'load_class' ) );
		}

		/**
		 * Unregisters the autoload function.
		 *
		 * @return void
		 */
		public function unregister() {
			spl_autoload_unregister( array( $this, 'load_class' ) );
		}

		/**
		 * Loads all the classes using autoload functionality.
		 *
		 * @param string $class_name Name of the class to include.
		 * @return void
		 */
		public function load_class( $class_name ) {

			if ( null === $this->namespace || $this->is_same_namespace( $class_name ) ) {
				$file_name   = '';
				$namespace   = '';
				$last_ns_pos = strripos( $class_name, $this->namespace_separator );

				if ( false !== ( $last_ns_pos ) ) {
					$namespace  = strtolower( substr( $class_name, 0, $last_ns_pos ) );
					$class_name = substr( $class_name, $last_ns_pos + 1 );
					$file_name  = str_replace( $this->namespace_separator, DIRECTORY_SEPARATOR, $namespace ) . DIRECTORY_SEPARATOR;
				}

				$class_file_name = strtolower( $class_name );
				$file_name      .= str_replace( '_', DIRECTORY_SEPARATOR, 'class-' . $class_file_name ) . $this->file_extension;
				$file_name1      = str_replace( 'otp', MOV_NAME, $file_name );

				if ( null !== $this->include_path ) {
					require_once $this->include_path . DIRECTORY_SEPARATOR . $file_name1;
				} else {
					require_once $file_name1;
				}
			}
		}

		/**
		 * Checks if a class name is in the same namespace.
		 *
		 * @param string $class_name Name of the class.
		 * @return boolean True if the class belongs to the same namespace, false otherwise.
		 */
		private function is_same_namespace( $class_name ) {
			return substr( $class_name, 0, strlen( $this->namespace . $this->namespace_separator ) ) === $this->namespace . $this->namespace_separator;
		}
	}
}
