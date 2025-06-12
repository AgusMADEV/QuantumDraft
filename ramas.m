function [y,tt,ne,imp,gain] = ramas(y,tt,ne,imp,gain,t0,x0,v0,Ex,Ey,anodo,dynodos,tubo,acc_grd,numdyn,traza,randangle)

global deltat mesh

% Definicion de constantes in SI
e=-1.6021892e-19; %Carga del electrón
q=e;
m=9.10953e-31;
c=299792458;
%mucero=4*pi*1e-7;

%Energía secundarios
Wsec=2; %Energía secundarios en eV
vsec=sqrt(2*Wsec*abs(q)/m);

% Pasos
num=1e5;

% Define containers
t=NaN(num,1);
x=NaN(num,3);
u=zeros(num,3);
v=zeros(num,3);
nEmed=zeros(num,1);

% Initialize first step
j=1;
t(j)=t0;
x(j,:)=x0;
% disp(' ')
% disp(['x0 = ',num2str(x0)])
v(j,:)=v0;
% disp(['v0 = ',num2str(v0)])
% disp(['||v0|| = ',num2str(norm(v0))])
% disp(' ')
gamman=1/sqrt(1-norm(v(j,:))^2/c^2);
u(j,:)=v0*gamman;

% Run until collision
coll = false;
j=2;
while ~coll && j<num
    xmed=x(j-1,:)+(deltat/(2*gamman))*u(j-1,:);
    if ~isinterior(tubo,xmed(1)*1e3,xmed(2)*1e3)
        disp('La particula se sale');
        y = [y;x(1:j-1,:)];
        tin = t(~isnan(t));
        tt = [tt;tin(1:end-1)];
        ne = [ne;gain*ones(length(tin)-1,1)];
        imp = [imp,9];
        gain=0;
        return
    end

    Bmed=[0, 0, 0];
    Emed(1) = Ex(xmed(1),xmed(2));
    Emed(2) = Ey(xmed(1),xmed(2));
    Emed(3) = 0;%Ez(xmed(1),xmed(2));
    nEmed(j)=norm(Emed);

    umenos=u(j-1,:)+(q*deltat/(2*m))*Emed;
    tao=(q*deltat/(2*m))*Bmed;
    uestrella=dot(umenos, tao)/c;
    gammamenos=sqrt(1+norm(umenos)^2/c^2);
    sigma=gammamenos^2-norm(tao)^2;
    gammamas=sqrt((sigma+sqrt(sigma^2+4*(norm(tao)^2+uestrella^2)))/2);
    tvec=tao/gammamas;
    s=1/(1+norm(tvec)^2);
    umas=s*(umenos+dot(umenos,tvec)*tvec+cross(umenos,tvec));

    u(j,:)=umas+((q*deltat)/(2*m))*Emed+cross(umas,tvec);
    gamman=sqrt(1+norm(u(j,:))^2/c^2);
    v(j,:)=u(j,:)/gamman;
    x(j,:)=xmed+(deltat/2)*v(j,:);
    t(j) = t(j-1)+deltat;
    if traza
        plot(x(j,1)*1e3,x(j,2)*1e3,'m.','MarkerSize',2)
    end
    if mod(j,10)==0
        drawnow
    end
    for h = 1:length(anodo)
        if isinterior(anodo(h),x(j,1)*1e3,x(j,2)*1e3)
            if traza
                plot(x(j,1)*1e3,x(j,2)*1e3,'r.')
            end
            y = [y;x(1:j-1,:)];
            tin = t(~isnan(t));
            tt = [tt;tin(1:end-1)];
            ne = [ne;gain*ones(length(tin)-1,1)];
            imp = [imp,9];
            disp(['Llega al ánodo ',num2str(h),'. Gain: ',num2str(gain)]);%,...
            %' Impactos: ',num2str(imp)])
            return
        end
    end
    for h = 1:length(acc_grd)
        if isinterior(acc_grd(h),x(j,1)*1e3,x(j,2)*1e3)
            if traza
                plot(x(j,1)*1e3,x(j,2)*1e3,'r.')
            end
            y = [y;x(1:j-1,:)];
            tin = t(~isnan(t));
            tt = [tt;tin(1:end-1)];
            ne = [ne;gain*ones(length(tin)-1,1)];
            imp = [imp,0];
            disp(['Atrapado en el grid ', num2str(h)])
            gain=0;
            disp(['Gain: ',num2str(gain)]);%,...
            %' Impactos: ',num2str(imp)])
            return
        end
    end
    showIntersectionPlot = false;
    k=0;
    while k<length(dynodos) && ~coll
        k = k+1;
        dynk = dynodos(k);
        coll = isinterior(dynk,x(j,1)*1e3,x(j,2)*1e3);
    end
    if coll % Intersección con la frontera del dynodo
        vert = dynk.Vertices;
        nvert = size(vert,1);
        nv=1;
        [xi,yi,inter] = linexline(x(j-1,1)*1e3,x(j-1,2)*1e3,x(j,1)*1e3,x(j,2)*1e3,...
            vert(nvert,1),vert(nvert,2),vert(nv,1),vert(nv,2),showIntersectionPlot);
        if inter
            ni = nv;
            nj = nvert;
        end
        nv=2;
        while ~inter && nv<=nvert
            [xi,yi,inter] = linexline(x(j-1,1)*1e3,x(j-1,2)*1e3,x(j,1)*1e3,x(j,2)*1e3,...
                vert(nv-1,1),vert(nv-1,2),vert(nv,1),vert(nv,2),showIntersectionPlot);

            if inter
                ni = nv;
                nj = nv-1;
            end
            nv = nv+1;
        end
        if traza
            plot(xi,yi,'go')
        end
        %         disp(['La particula toca la frontera del dynodo ',num2str(k-1),...
        %             ' entre los nodos ',num2str(nj),' y ',num2str(ni)])
        %         pause
        vnorm = [vert(ni,2)-vert(nj,2),vert(nj,1)-vert(ni,1)]; % Perpendicular a la frontera
        dir = x(j,1:2)-x(j-1,1:2);
        signo = sign(dot(vnorm,dir));
        vnorm = -signo*vnorm/norm(vnorm);
        nSurf = [vnorm,0];
        ndir = [dir,0];
        theta = atan2(norm(cross(-ndir,nSurf)),dot(-ndir,nSurf));
        if theta > pi/2
            theta = pi/2-theta;
            %                 disp('Ángulo > 90º')
        end
        vimpdos=v(j,1)^2+v(j,2)^2+v(j,3)^2;
        Wimpacto=0.5*(m/abs(q))*vimpdos; %Energía impacto eV
        if randangle
            rr=rand;
            th=asin(sqrt(rr));
            fi=2*pi*rand;
            yr=sin(th)*sin(fi);
            zr=cos(th);
            alpha=atan2(zr,yr)-pi/2;
            %             if alpha > pi/2
            %                 alpha = pi/2-alpha;
            % %                 disp('Ángulo > 90º')
            %             end
            %             alpha=pi/2*(2*rand-1);
            giro=[cos(alpha),sin(alpha),0;-sin(alpha),cos(alpha),0;0,0,1];
            nSurf = nSurf*giro';
        end
        if traza
            plot([xi, xi+nSurf(1)],[yi,yi+nSurf(2)],'k-')
        end
        v(j,:)=vsec*nSurf;
        gamman=sqrt(1/(1-norm(v(j,1:3))^2/c^2));
        u(j,1:3)=gamman*v(j,1:3);
        t0 = t(j);
        x0 = x(j-1,:);
        v0 = v(j,:);
        gain = gain*seyfunct(Wimpacto,theta,k); % SEY factor
        imp = [imp,k];
        %         norm(v0)/c
        %         y = [y;x(1:j-1,:)];
    end
    j=j+1;
end
y = [y;x(1:j-2,:)];
tin = t(~isnan(t));
ne = [ne;gain*ones(length(tin)-1,1)];
tt = [tt;tin(1:end-1)];
if Wimpacto>5%20;%40
    [y,tt,ne,imp,gain] = ramas(y,tt,ne,imp,gain,t0,x0,v0,Ex,Ey,anodo,dynodos,tubo,acc_grd,numdyn,traza,randangle);
else
    disp(['Atrapado en el dynodo ', num2str(numdyn(k))])
    disp(['Wimpacto ', num2str(Wimpacto)])
    gain=0;
end
end
