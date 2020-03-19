<?php declare(strict_types = 1);

namespace App\FrontModule\Presenters;

use App\FrontModule\Components\RegistrationForm;
use App\FrontModule\Components\RegistrationFormFactory;
use App\Model\Model;

class RegistrationPresenter extends BasePresenter
{

    /** @var Model @inject */
    public $model;

    /** @var RegistrationFormFactory @inject */
    public $registrationFormFactory;

    /** @var bool  */
    public $formSendSuccess = false;

    /** @var int  */
    public $campUsersCount = 0;

    public function actionDefault(): void
    {
        $participants = $this->model->registrations->findLatest();
        $participantsArray = $participants->fetchAll();

        $this->campUsersCount = $participants->count();
        $this->template->count = $this->campUsersCount;

        shuffle($participantsArray);

        $this->template->participants = $participantsArray;
        $this->title = 'Registrace na Nette Camp';
    }

    public function actionSuccess(): void
    {
        $this->title = 'Registrován';
    }


    public function actionWaitinglist(): void
    {
        $this->title = 'Zařazen do fronty';
    }


    public function createComponentRegistrationForm(): RegistrationForm
    {
        $fullCamp = false;
        if ($this->campCapacity <= $this->campUsersCount) {
            $fullCamp = true;
        }

        $form = $this->registrationFormFactory->create($fullCamp);

        $form->onSave[] = function () use ($fullCamp): void {
            if ($fullCamp) {
                $this->postGet('Registration:waitinglist');
                $this->setView('waitinglist');

            } else {
                $this->postGet('Registration:success');
                $this->setView('success');
            }

            $this->redrawControl('content');
        };

        return $form;
    }

}
