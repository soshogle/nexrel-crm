<?php

namespace FSProVendor\WPDesk\ActivationReminder\Composer;

use FSProVendor\Composer\Command\BaseCommand;
use FSProVendor\Symfony\Component\Console\Input\InputInterface;
use FSProVendor\Symfony\Component\Console\Output\OutputInterface;
/**
 * Can prepare activation reminder for plugin.
 *
 * @package WPDesk\Composer\GitPlugin\Command
 */
class PrepareActivationReminderCommand extends \FSProVendor\Composer\Command\BaseCommand
{
    protected function configure()
    {
        $this->setName('prepare-activation-reminder')->setDescription('Prepares activation reminder for WP Desk plugin.')->addOption('no-dev');
    }
    /**
     * Execute command.
     *
     * @param InputInterface $input
     * @param OutputInterface $output
     * @return int|void|null
     */
    protected function execute(\FSProVendor\Symfony\Component\Console\Input\InputInterface $input, \FSProVendor\Symfony\Component\Console\Output\OutputInterface $output)
    {
        $output->writeln("Creating activation reminder.");
        $settings = \FSProVendor\WPDesk\ActivationReminder\Composer\Settings::create_from_composer_settings($this->getComposer()->getPackage()->getExtra());
        $classLoader = (require 'vendor/autoload.php');
        $class_map = $classLoader->getClassMap();
        $random_class = $this->get_random_class($class_map);
        $random_letter = \strtolower(\chr(\rand(65, 90)));
        $target_file = $this->create_or_get_target_file_name($class_map, $random_class, $random_letter);
        if (!\file_exists($target_file)) {
            $target_dir = \dirname($target_file);
            $output->writeln("Target file name: {$target_file}");
            \copy('vendor/wpdesk/wp-wpdesk-activation-reminder/src/Reminder.php', $target_file);
            $popup_javascript_file = $target_dir . '/popup.js';
            $popup_css_file = $target_dir . '/popup.css';
            \copy('vendor/wpdesk/wp-wpdesk-activation-reminder/assets/js/popup.js', $popup_javascript_file);
            \copy('vendor/wpdesk/wp-wpdesk-activation-reminder/assets/css/popup.css', $popup_css_file);
            $this->prepare_class($random_class . $random_letter, $target_file, $popup_javascript_file, $popup_css_file, $settings);
        }
        $this->regenerate_autoload($target_file, $input);
        $output->writeln("Activation reminder created.");
    }
    private function create_or_get_target_file_name(array $class_map, $random_class, $random_letter)
    {
        $target_file_store = 'vendor/wpdesk/wp-wpdesk-activation-reminder/target-file';
        if (!\file_exists($target_file_store)) {
            $target_file = $class_map[$random_class];
            $target_file = \str_replace('.php', $random_letter . '.php', $target_file);
            $target_file = \str_replace(\getcwd() . '/vendor/composer/../../', '', $target_file);
            \file_put_contents($target_file_store, $target_file);
        }
        return \file_get_contents($target_file_store);
    }
    /**
     * @param string $class_file
     * @param InputInterface $input
     */
    private function regenerate_autoload($class_file, \FSProVendor\Symfony\Component\Console\Input\InputInterface $input)
    {
        $composer = $this->getComposer();
        $config = $composer->getConfig();
        $localRepo = $composer->getRepositoryManager()->getLocalRepository();
        $package = $composer->getPackage();
        $installationManager = $composer->getInstallationManager();
        $optimize = $config->get('optimize-autoloader');
        $autoload = $package->getAutoload();
        $autoload['files'] = isset($autoload['files']) ? $autoload['files'] : [];
        $autoload['files'][] = $class_file;
        $package->setAutoload($autoload);
        $composer->getAutoloadGenerator()->setDevMode(!$input->getOption('no-dev'));
        $composer->getAutoloadGenerator()->dump($config, $localRepo, $package, $installationManager, 'composer', $optimize);
    }
    /**
     * @param string $class_name
     * @param string $class_file
     * @param string $popup_javascript_file
     * @param string $popup_css_file
     * @param Settings $settings
     */
    private function prepare_class($class_name, $class_file, $popup_javascript_file, $popup_css_file, $settings)
    {
        $namespace = $this->prepare_namespace_from_class_name($class_name);
        $short_classname = $this->prepare_short_class_name_from_class_name($class_name);
        $file_contents = \file_get_contents($class_file);
        $file_contents = \str_replace('namespace ReminderNamespace;', 'namespace ' . $namespace . ';', $file_contents);
        $file_contents = \str_replace('class Reminder', 'class ' . $short_classname, $file_contents);
        $file_contents = \str_replace('plugin-dir', $settings->get_plugin_dir(), $file_contents);
        $file_contents = \str_replace('plugin-title', $settings->get_plugin_title(), $file_contents);
        $file_contents = \str_replace('popup-javascript-file', $settings->get_plugin_dir() . '/' . $popup_javascript_file, $file_contents);
        $file_contents = \str_replace('popup-css-file', $settings->get_plugin_dir() . '/' . $popup_css_file, $file_contents);
        $file_contents = \str_replace('script-version', \rand(1, 1000), $file_contents);
        $file_contents = \str_replace('logo-url', $settings->get_logo_url(), $file_contents);
        $file_contents = \str_replace('buy-plugin-url', $settings->get_buy_plugin_url(), $file_contents);
        $file_contents = \str_replace('how-to-activate-link', $settings->get_how_to_activate_link(), $file_contents);
        $file_contents = \str_replace('new Reminder();', 'new ' . $short_classname . '();', $file_contents);
        \file_put_contents($class_file, $file_contents);
    }
    /**
     * @param string $class_name
     *
     * @return string
     */
    private function prepare_namespace_from_class_name($class_name)
    {
        $exploded = \explode('\\', $class_name);
        unset($exploded[\count($exploded) - 1]);
        return \implode('\\', $exploded);
    }
    /**
     * @param string $class_name
     *
     * @return string
     */
    private function prepare_short_class_name_from_class_name($class_name)
    {
        $exploded = \explode('\\', $class_name);
        return $exploded[\count($exploded) - 1];
    }
    /**
     * @param array $class_map
     *
     * @return string
     */
    private function get_random_class($class_map)
    {
        do {
            $class_name = \array_rand($class_map);
        } while (\strpos($class_map[$class_name], '../../vendor_prefixed/wpdesk') === \false);
        return $class_name;
    }
}
