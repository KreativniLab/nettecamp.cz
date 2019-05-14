<?php

declare(strict_types=1);

namespace Nittro\Bridges\NittroLatte;

use Latte\Runtime\Template;
use Nette\Application\UI\Component;
use Nittro\Bridges\NittroUI\Helpers;


class NittroRuntime {

    /** @var Component */
    private $control;


    public static function initialize(Template $template) : void {
        if (
            isset($template->global->uiControl) && isset($template->global->nittro)
            && $template->global->uiControl instanceof Component && $template->global->nittro instanceof NittroRuntime
        ) {
            $template->global->nittro->control = $template->global->uiControl;
        }
    }

    public static function deprecated(string $old, string $new) : void {
        trigger_error(sprintf('The %s macro is deprecated, please use %s', $old, $old[0] === '{' ? '{' . $new . '}' : "n:$new"), E_USER_DEPRECATED);
    }


    public function getDialogId(string $name) : string {
        return Helpers::formatDialogId($name, $this->control);
    }

}
