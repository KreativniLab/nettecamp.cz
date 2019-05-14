<?php

declare(strict_types=1);

namespace Nittro\Bridges\NittroUI;
use Nette\Application\UI;


abstract class Presenter extends UI\Presenter {
    use PresenterUtils;


    protected function startup()
    {
        parent::startup();

        // Only redraw default snippets if nobody is receiving a signal
        $this->setRedrawDefault($this->getSignal() === NULL);
    }


    protected function afterRender()
    {
        parent::afterRender();

        if ($this->isAjax()) {
            // Redraw default snippets if enabled
            $this->redrawDefault();
        } else {
            $this->template->flashSession = $this->exportFlashSession();
        }
    }

    public function sendPayload() : void
    {
        // Send flash messages in payload
        $this->payload->flashes = $this->exportFlashSession();

        parent::sendPayload();
    }


}
