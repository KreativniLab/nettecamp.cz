<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

declare(strict_types=1);

namespace Aprila\Website;

use Nette\SmartObject;

class SiteLayout
{
	use SmartObject;

	public $develMode = FALSE;

	public $versionName = 'public';

	public $googleAnalytics = FALSE;

	protected $settings;


	/**
	 * SiteLayout constructor.
	 *
	 * @param array $settings
	 */
	public function __construct($settings = NULL)
	{
		if ($settings) {
			$this->settings = $settings;

			if (isset($settings['develMode'])) {
				$this->develMode = boolval($settings['develMode']);
			}

			if (isset($settings['versionName'])) {
				$this->versionName = (string)$settings['versionName'];
			}

			if (isset($settings['googleAnalytics'])) {
				$this->googleAnalytics = (string)$settings['googleAnalytics'];
			}

			if ($this->develMode) {
				$this->versionName = time();
			}

		}
	}

	/**
	 * get setting
	 *
	 * @param string $name
	 * @param mixed $default
	 */
	public function get($name = '', $default = NULL)
	{
		if (isset($this->settings[$name])){
			return $this->settings[$name];

		} else {
			return $default;
		}
	}
}
