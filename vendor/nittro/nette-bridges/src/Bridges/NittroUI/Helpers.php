<?php

declare(strict_types=1);

namespace Nittro\Bridges\NittroUI;

use Nette\Application\UI\Component;
use Nette\StaticClass;


class Helpers {
    use StaticClass;

    public static function formatDialogId(string $name, ?Component $component = null) : string {
        return $name[0] !== '@'
            ? 'dlg-' . ($component ? $component->getUniqueId() : '') . '-' . $name
            : substr($name, 1);
    }

}
