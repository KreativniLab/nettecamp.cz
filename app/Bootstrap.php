<?php

declare(strict_types=1);

namespace App;

use Nette\Configurator;

class Bootstrap
{
    public static function boot(): Configurator
    {
        $configurator = new Configurator();

        //$configurator->setDebugMode('23.75.345.200'); // enable for your remote IP
        $configurator->enableDebugger(__DIR__ . '/../log');

        $configurator->setTempDirectory(__DIR__ . '/../temp');

        $configurator->createRobotLoader()
            ->addDirectory(__DIR__)
            ->register();

        $configurator
            ->addConfig(__DIR__ . '/config/config.neon')
            ->addConfig(__DIR__ . '/config/config.local.neon');

        return $configurator;
    }
}
