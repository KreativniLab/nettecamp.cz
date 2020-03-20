<?php declare(strict_types = 1);

namespace Aprila\Website;

use Nette\SmartObject;

class SiteLayout
{

    use SmartObject;

    /** @var bool  */
    public $develMode = false;

    /** @var int|string  */
    public $versionName = 'public';

    /** @var bool|string  */
    public $googleAnalytics = false;

    /** @var mixed  */
    protected $settings;

    /**
     * @param mixed $settings
     */
    public function __construct($settings = null)
    {
        if ($settings) {
            $this->settings = $settings;

            if (isset($settings['develMode'])) {
                $this->develMode = boolval($settings['develMode']);
            }

            if (isset($settings['versionName'])) {
                $this->versionName = (string) $settings['versionName'];
            }

            if (isset($settings['googleAnalytics'])) {
                $this->googleAnalytics = (string) $settings['googleAnalytics'];
            }

            if ($this->develMode) {
                $this->versionName = time();
            }
        }
    }

    /**
     * get setting
     *
     * @param string|int|bool|null $default
     * @return mixed
     */
    public function get(string $name = '', $default = null)
    {
        return $this->settings[$name] ?? $default;
    }

}
